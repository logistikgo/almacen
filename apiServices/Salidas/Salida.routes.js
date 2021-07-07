const { Router } = require('express');
const router = new Router();

const Salida = require('./Salida.controller');


router.get('/api/salidas', Salida.get);
router.get('/api/salidas/contadores', Salida.getContadoresSalidas);
router.get('/api/salidaByID/:salida_id', Salida.getByID);
router.get('/api/getSalidasByIDs', Salida.getSalidasByIDs);
router.get('/api/getSalidasxRangoFechas', Salida.getxRangoFechas);
router.get('/api/getSalidasReporte', Salida.getReportePartidas);
router.post('/api/salida', Salida.save);
router.post('/api/salidas', Salida.createSalidaToSave);
router.put('/api/salida', Salida.update);
router.post('/api/salidaAutomatica', Salida.saveSalidaAutomatica);
router.put('/api/updateStatusSalidas',Salida.updateStatusSalidas);
//reprotesCheat
router.post('/api/importsalidas',Salida.importsalidas);

module.exports = router;