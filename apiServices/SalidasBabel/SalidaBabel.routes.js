const { Router } = require('express');
const router = new Router();

const Salida = require('../Salidas/Salida.controller');

 //salidas
 router.post('/api/saveSalidaBabel', Salida.saveSalidaBabel);
 router.post('/api/removefromSalidaId', Salida.removefromSalidaId);
 router.post('/api/agregarPartidaSalidaId', Salida.agregarPartidaSalidaId);
 router.post('/api/SalidaAuto', Salida.saveDashboard);
 router.post('/api/ReloadPedidosBabel', Salida.reloadPedidosBabel);

 module.exports = router;