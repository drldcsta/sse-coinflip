console.log("looks like we made it")

const start_button = document.querySelector("#start-button");
const stop_button = document.querySelector("#stop-button");
const brag_button = document.querySelector("#brag-button")
const flip_button = document.querySelector("#flip-button")
const score_board = document.querySelector("#score-board")
const wall_age = document.querySelector("#wall-age")
const leader_board = document.querySelector("#leader-board-container")
const leader_board_bronze = document.querySelector("#leader-board-bronze")
const bronze_container = document.querySelector("#bronze-container")
const leader_board_silver = document.querySelector("#leader-board-silver")
const silver_container = document.querySelector("#silver-container")
const leader_board_gold = document.querySelector("#leader-board-gold")
const gold_container = document.querySelector("#gold-container")
const leader_board_platinum = document.querySelector("#leader-board-platinum")
const platinum_container = document.querySelector("#platinum-container")
const chat_window = document.querySelector("#chat-container")
const user_input = document.querySelector("#username-input")
const server_sent_info = document.querySelector("#server-sent-info")
const server_sent_flip = document.querySelector("#server-sent-flip")
const win = document.querySelector("#wins")
const loss = document.querySelector("#losses")
const coin_state_container = document.querySelector("#coinState")
const logger = document.querySelector("#logger")

let coin_value
let has_bragged = false

win.innerText = 0
loss.innerText = 0


//Cookie manipulation functions from SO::2144386
function setCookie(name,value,days) { 
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {   
    document.cookie = name+'=; Max-Age=-99999999;';  
}

//If there is a user cookie present, populate the name field
if (getCookie("user")) {
  user_input.setAttribute("value",decodeURI(getCookie("user")))
}

//seconds to human function taken from SO::8211744
function humanTime(seconds) {
    var levels = [
        [Math.floor(seconds / 31536000), 'years'],
        [Math.floor((seconds % 31536000) / 86400), 'days'],
        [Math.floor(((seconds % 31536000) % 86400) / 3600), 'hours'],
        [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'minutes'],
        [(((seconds % 31536000) % 86400) % 3600) % 60, 'seconds'],
    ];
    let returntext = '';

    for (let i = 0, max = levels.length; i < max; i++) {
        if ( levels[i][0] === 0 ) continue;
        returntext += ' ' + levels[i][0] + ' ' + (levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length-1): levels[i][1]);
    };
    return returntext.trim();
}

//conditional logging based on presence of logging cookie
//logs as table if second param true
function log(str,table=false) {
  if (getCookie("logging")) {
    if (table === true) {
      console.table(str)
    } else {
      console.log(str)
    }
  }
}

//what it says on the label
function flip_coin() {
  if (coin_value === undefined) { 
    const coin_value_raw = Math.floor(Math.random() * Math.floor(2))
    coin_value_raw === 1 ? coin_value = true : coin_value = false
  } else if (coin_value !== undefined) {
    coin_value = ! coin_value 
  }
  if (coin_value) {
    coin_state_container.innerText = "You've got Heads"
    coin_state_container.dataset.state = true
  } else if (!coin_value) {
    coin_state_container.innerText = "You've got Tails"
    coin_state_container.dataset.state = false
  }
  log(coin_state_container.innerText)
  return coin_value
}

//set initial coin value
coin_value = flip_coin()

//function to pull out data from DOM elements
function get_vars() {
  let wins = parseInt(win.innerText)
  let losses = parseInt(loss.innerText)
  const total = wins + losses 
  const user = user_input.value
  const win_raw = (wins / total) * 100 
  const win_percent = parseFloat(win_raw.toFixed(2))
  const local_time = Math.round(Date.now() / 1000)
  wins = isNaN(wins) ? wins = 1 : wins = wins + 1;
  losses = isNaN(losses) ? losses = 1 : losses = losses + 1
  return {
    wins,
    losses,
    total,
    user,
    win_percent,
    local_time,
  }
}
  

//nesting terniary statements is a good idea. 
function update_local_flip_stats(ev) {
  const var_obj = get_vars()
  const local_time = Math.round(Date.now() / 1000)
  const msg_obj = JSON.parse(ev.data)
  server_sent_info.classList.remove("hidden")
  if (msg_obj.time >= var_obj.local_time && msg_obj.flip === coin_value ) {
    msg_obj.flip  ? server_sent_flip.innerText = "Heads" : server_sent_flip.innerText = "Tails"
    log(`[${ev.type}] - msgID: ${ev.lastEventId} - flip: ${msg_obj.flip} - winPercent: ${var_obj.win_percent} - Server Time Delta: ${local_time - msg_obj.time } - BE connections: ${msg_obj.bec} - Flip Status: Player Won - Has Bragged: ${has_bragged} `);
    win.innerText = var_obj.wins
    // document.body.style.backgroundColor = "green"
  } else if (msg_obj.time >= var_obj.local_time && msg_obj.flip != coin_value ) {
      msg_obj.flip  ? server_sent_flip.innerText = "Heads" : server_sent_flip.innerText = "Tails"
      log(`[${ev.type}] - msgID: ${ev.lastEventId} - flip: ${msg_obj.flip} - winPercent: ${var_obj.win_percent} - Server Time Delta: ${local_time - msg_obj.time } - BE connections: ${msg_obj.bec} - Flip Status: Player Lost - Has Bragged: ${has_bragged}`);
    loss.innerText = var_obj.losses
    // document.body.style.backgroundColor = "red"
  }
  if (has_bragged) {has_bragged += 1}
  if (has_bragged >= 51) {has_bragged = false}
    if (!has_bragged || has_bragged >= 50) {
      brag_button.classList.remove("hidden")
      brag_button.addEventListener("click",send_brag)
    } else {
    brag_button.classList.add("hidden")
  }
}


function send_brag() {
  const var_obj = get_vars()
  const win_percent = Math.round((var_obj.wins / var_obj.total) * 100)
  const URL =  '/msg'
  const raw_data = {
    user : var_obj.user,
    percent : var_obj.win_percent,
    total: var_obj.total,
  }
 // log(raw_data)
  const data = JSON.stringify(raw_data)
  const params = {
    headers:{
      "content-type" : "application/json; charset=UTF-8"
    },
    body : data,
    method : "POST"
  }
  log(data)
  fetch(URL,params)
    .then(resp => {log(resp)})
  has_bragged = true
  brag_button.removeEventListener("click",send_brag)
  brag_button.classList.add("hidden") 
}


function update_chat_window(ev) {
  const msg_obj = JSON.parse(ev.data)
  const local_time = Math.round(Date.now() / 1000)
  if (msg_obj.time >= local_time) {
    const user = msg_obj.user
    const total = msg_obj.total
    const percent = msg_obj.percent
    const node = document.createElement("li")
    const brag_alert = document.createTextNode(`⭐BRAG ALERT⭐ ${user} has won ${percent}% of their last ${total} coin flips!!`)
    node.appendChild(brag_alert)
    log(brag_alert)
    chat_window.insertBefore(node,chat_window.childNodes[0])
  }
}


function update_leaderboard(ev,init=false) {
  const divisions = {
    bronze : {
      board : leader_board_bronze,
      container : bronze_container,
      min : 5,
      max : 99,
    },
    silver : {
      board : leader_board_silver,
      container : silver_container,
      min : 100,
      max : 999,
    },
    gold : {
      board : leader_board_gold,
      container : gold_container,
      min : 1000,
      max : 9999,
    },
    platinum: {
      board : leader_board_platinum,
      container : platinum_container,
      min : 10000,
      max : Infinity,
    },
  }
  let msg_obj 
  if (init) {
    msg_obj = ev
  } else {
    msg_obj = JSON.parse(ev.data)
  }
  if (msg_obj) {leader_board.classList.remove("hidden")}
  
  Object.keys(divisions).forEach((division) => {
    const leaders = msg_obj.filter((obj) => {
      if (obj.total >= divisions[division].min && obj.total <= divisions[division].max) {
        return true
      }
    })
    .sort((a,b) => {return b.percent - a.percent})
    .slice(0,10)
  
    divisions[division].board.innerText = ""
    if (leaders[0]) {
      divisions[division].container.classList.remove("hidden")
      divisions[division].board.innerText = ""
      let header = divisions[division].board.insertRow(0)
      header.setAttribute("id","leader-header")
      let hplay = document.createElement("th")
      hplay.innerText = "Player"
      let hperc = document.createElement("th")
      hperc.innerText = "Percent"
      let htotal = document.createElement("th")
      htotal.innerText = "Total"
      header.append(hplay)
      header.append(hperc)
      header.append(htotal)  
      divisions[division].board.appendChild(header)

      let table_pos = 1
      leaders.forEach((leader) => {
        let row = divisions[division].board.insertRow(table_pos)
        let play = document.createElement("td")
        play.innerText = leader.user
        play.setAttribute("title",new Date(leader.time).toLocaleString())
        let perc = document.createElement("td")
        perc.innerText = leader.percent
        let total = document.createElement("td")
        total.innerText = leader.total
        row.append(play)
        row.append(perc)
        row.append(total)
        divisions[division].board.appendChild(row)
        table_pos++
      })
    } 
  }) 
}


fetch("/leaderboard")
  .then((res) => {
    if (res.status == 200 && res.headers.get("age") == 0) {
      wall_age.innerText = ` - Pulled from Origin`
      wall_age.classList.remove("hidden")
    } else if (res.status == 200 && res.headers.get("age") > 0) {
      wall_age.innerText = ` - cached ${humanTime(res.headers.get("age"))}`
      wall_age.classList.remove("hidden")
    } else {
      wall_age.innerText = ` - failed to load leaderboard data`
      wall_age.classList.remove("hidden")
      wall_age.style.color = "red"
    }
    console.log(res.status)
    return res.json()}
  )
  .then(json => update_leaderboard(json,true))



function startStream() {
  const es = new EventSource("/stream");
  es.onopen = (e) => log(`Established connection to ${e.target.url}`);
  es.onerror = (e) => log(`ruh-roh raggy`)
  es.addEventListener('msgStream', update_local_flip_stats );
  es.addEventListener('bragEvent', update_chat_window)
  es.addEventListener('leaderBoard',update_leaderboard)
  stop_button.addEventListener("click",function () {
    es.removeEventListener('msgStream',update_local_flip_stats)
    es.close()
    start_button.classList.remove("hidden");
    stop_button.classList.add("hidden");
    score_board.classList.add("hidden");
    user_input.removeAttribute("disabled")
    win.innerText = 0
    loss.innerText = 0
    server_sent_info.classList.add("hidden")
  })
}

start_button.addEventListener("click", function () {
  if (get_vars().user) {
    startStream();
    start_button.classList.add("hidden");
    stop_button.classList.remove("hidden");
    score_board.classList.remove("hidden");
    setCookie("user",encodeURI(get_vars().user),365)
    user_input.setAttribute("disabled","true")
  } else {
   window.alert("you must input a user name to play!") 
  }
});

flip_button.addEventListener("click", flip_coin)

logger.addEventListener("click",() => {
  if (!getCookie("logging")) {
   setCookie("logging",1,1)
   log("logging enabled")
   window.alert("Mozart's Ghost Says: Logging Enabled") 
  } else {
    log("disabling logging")
   eraseCookie("logging")
  }
})