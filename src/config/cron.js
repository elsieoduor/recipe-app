// import cron from 'cron'
// import https from 'https'

// const job = new cron.CronJob("*/14 * * * *", function (){
//     https.get(process.env.API_URL, (res)=>{
//         if (res.statusCode ===200) console.log('GET request sent successfully')
//             else console.log('Error sending GET request', res.statusCode)
//     }).on("error", (e)=> console.error("Error while sending request", e))
// })

// export default job
import cron from 'cron';
import https from 'https';

// Configuration
const PING_INTERVAL = '*/14 * * * *'; // Every 14 minutes
const PING_URL = 'recipe-app-w5x7.onrender.com';
const PING_PATH = '/api/health'; // Using health check endpoint instead of root
const TIMEOUT_MS = 10000; // 10 seconds timeout

const job = new cron.CronJob(
  PING_INTERVAL,
  function () {
    console.log(`[${new Date().toISOString()}] Initiating health ping...`);
    
    const options = {
      hostname: PING_URL,
      path: PING_PATH,
      method: 'GET',
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`Health ping successful. Response: ${data.trim()}`);
        } else {
          console.error(`Health ping failed with status ${res.statusCode}. Response: ${data.trim()}`);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('Health ping request timed out');
    });

    req.on('error', (e) => {
      console.error('Health ping request failed:', e.message);
    });

    req.end();
  },
  null, // onComplete
  true, // start immediately
  'UTC' // timezone
);

// Handle process termination
process.on('SIGTERM', () => {
  job.stop();
  console.log('Cron job stopped gracefully');
});

export default job;


// /*
//  * CRON JOB EXPLANATION:
//  * 
//  * Purpose: Prevent Render.com free tier from spinning down our API by sending periodic requests.
//  * 
//  * Schedule Format (5 fields):
//  * ┌───────────── minute (0 - 59)
//  * │ ┌───────────── hour (0 - 23)
//  * │ │ ┌───────────── day of the month (1 - 31)
//  * │ │ │ ┌───────────── month (1 - 12)
//  * │ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
//  * │ │ │ │ │
//  * │ │ │ │ │
//  * * * * * *
//  * 
//  * Examples:
//  * - "*/14 * * * *"    Every 14 minutes
//  * - "0 0 * * 0"       At midnight on every Sunday
//  * - "30 3 15 * *"     At 3:30 AM on the 15th of every month
//  * - "0 0 1 1 *"       At midnight on January 1st
//  * - "0 * * * *"       Every hour at minute 0
//  * 
//  * Improvements in this version:
//  * 1. Added proper response body collection
//  * 2. Implemented request timeout
//  * 3. Better logging with timestamps
//  * 4. Graceful shutdown handling
//  * 5. Using health check endpoint instead of root
//  * 6. Configurable constants at top
//  * 7. More detailed documentation
//  */

// CRON JOB EXPLANATION:
// Cron jobs are scheduled tasks that run periodically at fixed intervals
// we want to send 1 GET request for every 14 minutes so that our api never gets inactive on Render.com

// How to define a "Schedule"?
// You define a schedule using a cron expression, which consists of 5 fields representing:

//! MINUTE, HOUR, DAY OF THE MONTH, MONTH, DAY OF THE WEEK

//? EXAMPLES && EXPLANATION:
//* 14 * * * * - Every 14 minutes
//* 0 0 * * 0 - At midnight on every Sunday
//* 30 3 15 * * - At 3:30 AM, on the 15th of every month
//* 0 0 1 1 * - At midnight, on January 1st
//* 0 * * * * - Every hour