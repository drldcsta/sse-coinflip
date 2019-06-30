const winston = require('winston');
 
require('winston-papertrail').Papertrail;

const winstonPapertrail = new winston.transports.Papertrail({
  host: process.env.PAPERTRAIL_HOST,
  port: process.env.PAPERTRAIL_PORT,
  program: "Lucktest-App",

})

winstonPapertrail.on('error', function(err) {
  console.error(err)
  // Handle, report, or silently ignore connection errors and failures 
});

const logger = new winston.Logger({
  transports: [winstonPapertrail],
})

logger.stream = {
  write: function(message, encoding){
    logger.info(message);
  }
};

module.exports = logger