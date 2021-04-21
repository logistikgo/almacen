const { Router } = require('express');
const router = new Router();

const SalidaBabel = require('./SalidaBabel.controller')
 //salidas
 router.post('/api/saveSalidaBabel', SalidaBabel.saveSalidaBabel);
 router.post('/api/removefromSalidaId', SalidaBabel.removefromSalidaId);
 router.post('/api/agregarPartidaSalidaId', SalidaBabel.agregarPartidaSalidaId);
 router.post('/api/SalidaAuto', SalidaBabel.saveDashboard);
 router.post('/api/ReloadPedidosBabel', SalidaBabel.reloadPedidosBabel);

 module.exports = router;