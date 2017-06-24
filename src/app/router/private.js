import { Router } from 'express';
import * as marketApi from '../market-api';
import * as account from '../account';
import logger from '../util/logger';

let router = Router();
router.use('/', (req, res, next) => {
  logger.verbose(`[${Date()}] ${req.url} called`);
  let signObj = req.body || {};
  signObj.nonce = req.headers.nonce;

  let apiKey = req.headers['api-key']
  let signValue =  req.headers['sign'];
  let auth = account.authenticate(apiKey, signObj, signValue);
  if (!auth) {
    res.sendStatus(401);
    return;
  }
  next();
});

router.get('/markets/:market/balances', (req, res) => {
  let apiKey = req.headers['api-key'];
  let keys = account.getMarketKeys(apiKey, req.params.market);
  marketApi.load(req.params.market).getBalances(keys).then(result => {
    res.json(result.balances);
  }).catch(err => {
    console.log(err);
    res.sendStatus(500);
  });
});

router.post('/markets/:market/:base/:vcType', (req, res) => {
  let apiKey = req.headers['api-key'];
  let keys = account.getMarketKeys(apiKey, req.params.market);
  marketApi.load(req.params.market).buy(
    keys,
    req.params.base,
    req.params.vcType,
    req.body.units,
    req.body.price
  ).then(result => {
    result.trades.forEach(t => {
      account.addAsset(apiKey, req.params.market, t);
      account.addHistory(apiKey, req.params.market, t);
    });
    res.json(result);
    logger.info(`[${Date()}] Purchase - ${req.params.base}_${req.params.vcType} : ${req.body.units} - ${req.body.price}`);
    logger.info(result.trade);
  }).catch(err => {
    res.status(500).send(er);
  });
});


router.delete('/markets/:market/:base/:vcType', (req, res) => {
  let apiKey = req.headers['api-key'];
  let keys = account.getMarketKeys(apiKey, req.params.market);
  marketApi.load(req.params.market).sell(
    keys,
    req.params.base,
    req.params.vcType,
    req.body.units,
    req.body.price
  ).then(result => {
    result.trades.forEach(t => {
      account.removeAsset(apiKey, req.params.market, t.base, t.vcType, t.units);
      account.addHistory(apiKey, req.params.market, t);
    });
    res.json(result);
    logger.info(`[${Date()}] Sale - ${req.params.base}_${req.params.vcType} : ${req.body.units} - ${req.body.price}`);
    logger.info(result.raw);
  }).catch(err => {
    res.status(500).send(err);
  });
});

export default router;
