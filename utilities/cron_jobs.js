// controllers/cronCtrl.js

var cron          = require('node-cron');         // Cron
var fs            = require('fs');                // for file reading/writing
var public_path   = __dirname + '/../public';        // public path
var telegramCtrl  = require(__dirname + '/../controllers/telegramCtrl.js');
var arbitrageCtrl = require(__dirname + '/../controllers/arbitrageCtrl.js');
var ethermineCtrl = require(__dirname + '/../controllers/ethermineCtrl.js');
var helpers       = require(__dirname + '/helpers.js');

// =============================================================================
// =============================================================================
// =================================ARBITRAGE===================================
// =============================================================================
// =============================================================================

cron.schedule('*/2 * * * *', function(){
  function check_arbitrage(error, usd_clp, international_price, exchanges){
    var file = public_path + '/arbitrages.txt';
    var datetime = '[' + (new Date()).toLocaleString() + '] ';
    if (error){
      console.error('error while cron calculating arbitrage: ' + error);
    } else {
      var arbitrage = arbitrageCtrl.arbitrage_calc(exchanges, usd_clp);
      arbitrage.forEach(function(arbitrage_opportunity) {
        var text = datetime
                   + " // "
                   + arbitrage_opportunity.amount
                   +" // " + arbitrage_opportunity.origin.name
                   + ' *->* '
                   + arbitrage_opportunity.destination.name
                   + '\n';
        fs.appendFile(file, text, function (err) {
            if (err) return console.error(err);
        });
        //========================= TELEGRAM ALERT ==============================
        telegramCtrl.arbitrage_alerts(arbitrage_opportunity);
      });
    }
  }
  arbitrageCtrl.eth_prices(check_arbitrage);
});

// =============================================================================
// =============================================================================
// =================================MINER OK?===================================
// =============================================================================
// =============================================================================

cron.schedule('*/10 * * * *', function(){
  function check_miner(error, answer, workers_count, hashing_0, user){
    if (error) {
      console.error("ERROR on MinerOK?: " + error);
      telegramCtrl.telegram.sendMessage(process.env.telegram_admin_id, "ERROR on MinerOK?: " + error);
    } else {
      if (workers_count != user.n_workers) {
        telegramCtrl.telegram.sendMessage(user._id, "*WARNING!*\nNumber of workers changed from " + user.n_workers + " to " + workers_count, {
          parse_mode: "Markdown"
        });
        user.n_workers = workers_count;
        user.save();
      }
      if (hashing_0) {
        telegramCtrl.telegram.sendMessage(user._id, answer, {
          parse_mode: "Markdown"
        });
      }
    }
  }
  helpers.iterate_users(function(user) {
    if (user.miner_address) {
      ethermineCtrl.check_miner_ok(user, check_miner);
    }
  });
});

// =============================================================================
// =============================================================================
// ================================ETH_CHANGE===================================
// =============================================================================
// =============================================================================

cron.schedule('*/5 * * * *', function(){
  function check_alerts(error, international_price){
    if (error){
      console.error('error while cron calculating eth_change alerts: ' + error);
    } else {
      telegramCtrl.price_change_alerts('ETH', international_price);
    }
  }
  arbitrageCtrl.eth_price(check_alerts);
});

// =============================================================================
// =============================================================================
// ================================BTC_CHANGE===================================
// =============================================================================
// =============================================================================


cron.schedule('*/5 * * * *', function(){
  function check_alerts(error, international_price){
    if (error){
      console.error('error while cron calculating btc_change alerts: ' + error);
    } else {
      telegramCtrl.price_change_alerts('BTC', international_price);
    }
  }
  arbitrageCtrl.btc_price(check_alerts);
});
