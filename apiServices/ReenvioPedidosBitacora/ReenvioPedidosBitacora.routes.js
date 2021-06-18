
const { Router } = require('express');
const router = new Router();

const ReenvioPedidosBitacora = require('./ReenvioPedidosBitacora.controller');

router.get('/api/bitacoraReenvioPedidos', ReenvioPedidosBitacora.get)

module.exports = router;