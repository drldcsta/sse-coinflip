console.log("looks like we made it!")

// init project
const express = require('express');
const app = express();
const SSEChannel = require('sse-pubsub');
const logger = require('./logger');
const Names = require('./Names')
const morgan = require('morgan');
const bodyParser = require('body-parser');
const winston = require('winston');
const cookieParser = require('cookie-parser')
const expressWinston = require('express-winston');
const cacheControl = require('express-cache-controller');
const fastly = require('fastly-promises');
const fastly_service = fastly(process.env.FASTLY_PURGER_KEY,process.env.FASTLY_SERVICE_ID)
const fetch = require('node-fetch');
let brags = [];
const purge_urls = ["/","/client.js","/style.css","/testing","/stream","/admin"]//,"/leaderboard"]

//settings for the SSE stream (what sends the coin flip messages)
const channel = new SSEChannel({
  startId: 1,
  maxStreamDuration: 15000,
  rewind: 0,
  historySize: 0,
});

//This runs on Server restart and fetches the leaderboard from the cache
fetch(`https://${process.env.FASTLY_DOMAIN}/data/leaderboard`)
  .then(res => res.json())
  .then(json => brags = json)
  .then((after) => {
    console.log(`Loaded up ${after.length} entries from the leaderboard cache on server restart`)
    logger.info(`Loaded up ${after.length} entries from the leaderboard cache on server restart`)
   })
  .catch((err) => {
    console.log(`failed to fetch leaderboard at startup - ${err}`)
    logger.info(`failed to fetch leaderboard at startup - ${err}`)
  })




app.use(express.static('public',{
  setHeaders: function(res,path,stat) {
    res.set('cache-control','s-max-age=31536000,max-age=3600')
  }
}));



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser())
app.use(cacheControl());



const stream_interval = 1250 //how often server sends messages

// purge_urls.forEach((purge_url) => {
//   fastly_service.purgeIndividual(`lucktest.drl.fyi${purge_url}`)
//   .then((res) => {
//     console.log(`sent a purge request for ${purge_url} got ${res.status} response`)
//     logger.info(`sent a purge request for ${purge_url} got ${res.status} response`)
//   })
//   .catch(err => console.log(err))
// })

//Function for building event stream msg
function build_msg () {
  let flip
  const time = Math.round(Date.now() / 1000)
  const flip_raw = Math.floor(Math.random() * Math.floor(2))
  flip_raw === 1 ? flip = true : flip = false
  const bec = channel.getSubscriberCount()
  const msg_obj = {
    time,
    flip,
    bec,
  }
  const msg = JSON.stringify(msg_obj)
  return msg
}


//ABS Always Be Sending...Messages
setInterval(() => channel.publish(build_msg(), 'msgStream'), stream_interval);


app.get('/', function(req, res) {
  if (req.headers["fastly-ff"] || req.cookies[process.env.DELICIOUS_COOKIE]) {
    res.cacheControl = {
      maxAge : 3600,
      sMaxAge: 31536000,
    };
    res.sendFile(__dirname + '/views/index.html');
  } else {
    res.status(403).send(`Please get  to https://${process.env.FASTLY_DOMAIN}/`)
  }
});

app.put('/admin/resetcache' , (req,res) => {
  purge_urls.forEach((purge_url) => {
  fastly_service.purgeIndividual(`${process.env.FASTLY_DOMAIN}/${purge_url}`)
    .then((purge) => {
      console.log(`sent a purge request for ${purge_url} got ${purge.status} response`)
      logger.info(`sent a purge request for ${purge_url} got ${purge.status} response`)
    })
    .catch((err) => {
      console.log(err)
    })
  })
  res.sendStatus(200) 
});

app.put('/admin/resetleaderboard' , (req,res) => {
  //Generates a random number between min and max (rounds by default unless 3rd arg is faulse)
  function randNum(min,max,round=true) {
    if (round == true){
      return Math.floor(Math.random()*(max-min+1)+min);
    } else {
      return (Math.random()*(max-min+1)+min).toFixed(2)
    }
  }
  
  let fake_brags = []
  function fakeEntries() {
    //brozne leaders
    "|||||||".split("").forEach((thing) => {
     let entry = {"user":`${Names.randName()}`,"total":parseInt(randNum(10,99)),"percent":parseFloat(randNum(35,65,false)),"time":parseInt(Date.now() - randNum(5000,86400000))}
     fake_brags.push(entry)
    })
    //Silver leaders
    "||||||".split("").forEach((thing) => {
      let entry = {"user":`${Names.randName()}`,"total":parseInt(randNum(100,999)),"percent":parseFloat(randNum(43,57,false)),"time":parseInt(Date.now() - randNum(5000,86400000))}
      fake_brags.push(entry)
    })
    //Gold leaders
    "|||||".split("").forEach((thing) => {
      let entry = {"user":`${Names.randName()}`,"total":parseInt(randNum(1000,9999)),"percent":parseFloat(randNum(45,55,false)),"time":parseInt(Date.now() - randNum(5000,86400000))}
      fake_brags.push(entry)
    })
    brags = fake_brags.slice(0)
    console.log(`the leaderboard has been refreshed`)
  }
  fakeEntries()
  brags = fake_brags.splice(0)
  // console.log(brags)
  // console.log(fake_brags)
  fastly_service.purgeIndividual(`${process.env.FASTLY_DOMAIN}/data/leaderboard`)
    .then((purge) => {
      console.log(`sent a purge request for /leaderboard got ${purge.status} response`)
      logger.info(`sent a purge request for /leaderboard got ${purge.status} response`)
    })
    .catch((err) => {
      console.log(err)
    })
  
  res.sendStatus(200) 
});


 
app.get('/admin', function(req, res) {
  if (req.headers["fastly-ff"] || req.cookies[process.env.DELICIOUS_COOKIE]) {
    res.cacheControl = {
      maxAge : 3600,
      sMaxAge: 31536000,
    };
    res.sendFile(__dirname + '/views/admin.html');
  } else {
    res.status(403).send("you ain't bout this admin life, don")
  }
});


app.get('/testing',(req,res) => {
  if (req.headers["fastly-ff"] || req.cookies[process.env.DELICIOUS_COOKIE]) {
    res.json(req.cookies)
    fastly_service.purgeIndividual(`${process.env.FASTLY_DOMAIN}/testing`)
      .then(res => console.log(`sent purge for /testing, got ${res.status}`))
  } else {
   res.send("that aint it chief") 
  }
})




app.get('/healthcheck' , (req,res) => {
  res.sendStatus(200) 
});

app.get('/data/leaderboard' , (req,res) => {
  res.cacheControl = {
    sMaxAge: 31536000
  };
  res.json(brags)
})

app.get('/stream', (req, res) => {
  channel.subscribe(req, res)
  channel.publish(brags,"leaderBoard")
  logger.info(`Request made on /stream from ${req.headers['x-forwarded-for']} via ${req.ip} - ${channel.getSubscriberCount()} connections to back end`)

});



app.post('/msg', (req, res) => {
  const user = req.body.user
  const percent = req.body.percent
  const total = req.body.total
  const time = Math.round(Date.now())
  const brag_body = {
    user,
    total,
    percent,
    time,
  }
  brags.push(brag_body)
  channel.publish(brags,"leaderBoard")
  channel.publish(brag_body,"bragEvent")
  fastly_service.purgeIndividual(`${process.env.FASTLY_DOMAIN}/data/leaderboard`)
    .then((purge_resp) => {
      console.log(`Leaderboard has been updated. Sent a purge for /leaderboard got ${purge_resp.status} response`)
      logger.info(`Leaderboard has been updated. Sent a purge for /leaderboard got ${purge_resp.status} response`)
      fetch(`https://${process.env.FASTLY_DOMAIN}/data/leaderboard`)
        .then(res => res.json())
        .then((json) => {
          // console.log(`Warming /leaderboard cache: ${JSON.stringify(json)}`)
          // logger.info(`Warming /leaderboard cache: ${JSON.stringify(json)}`)
        })
        .catch((err) => {
          console.log(`Failed to fetch leaderboard. - ${err}`)
          logger.info(`Failed to fetch leaderboard. - ${err}`)
        })
    })
 res.sendStatus(200)
})
 
 
app.post('/banhammer' , (req,res) => {
  console.log(req.body)
  fetch("https://api.fastly.com/service/2qYi5eOiSdJtqqoTtZ8sZq/dictionary/1vbpCXXeHYzYg5CqBloyZD/item",{
       method: 'POST',
       body: `item_key=${req.body.item_key}&item_value=fo_sho`,
       headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Fastly-Key': process.env.FASTLY_PURGER_KEY,
       }
     }
  )
  .then(res => {
    console.log(res)
  })
  .catch(err =>{
    console.log(err)
  })
  res.sendStatus(200) 
});




// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
