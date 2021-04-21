const { Router } = require('express');
const router = new Router();

const TarifaPES = require('./TarifaPES.controller');

//Tarifas
router.get('/api/tarifaPES', TarifaPES.get);
router.get('/api/tarifaPES/:_id', TarifaPES.getByID);
router.get('/api/tarifaPES/cliente/:cliente_id', TarifaPES.getByCliente);
router.post('/api/tarifaPES', TarifaPES.post);
router.put('/api/tarifaPES/:_id', TarifaPES.put);
router.delete('/api/tarifaPES/:_id', TarifaPES._delete);

module.exports = router;