const { Router } = require('express');
const router = new Router();

const Entrada = require('./Entrada.controller');


router.get('/api/entradas', Entrada.get);
router.get('/api/entrada', Entrada.getById);
router.get('/api/getSalidasByEntradaId', Entrada.getSalidasByEntradaID);
router.get('/api/getEntradasxRangoFechas', Entrada.getxRangoFechas);
router.post('/api/getEntradasReporte', Entrada.getEntradasReporte);
router.put('/api/entrada', Entrada.update);
router.post('/api/entrada', Entrada.save);
router.post('/api/entradaAutomatica', Entrada.saveEntradaAutomatica);
router.post('/api/validaEntrada', Entrada.validaEntrada);
router.put('/api/updateRemision', Entrada.updateRemision);
router.put('/api/updateStatus', Entrada.updateStatus);

router.post('/api/saveEntradaPisa',Entrada.saveEntradaPisa);

//PosicionamentoAuto
router.post('/api/posicionarPrioridades', Entrada.posicionarPrioridades);
router.post('/api/posicionarManual', Entrada.posicionarManual);
//gettotalcajas
router.get('/api/getTarimasAndCajas/:_id', Entrada.getTarimasAndCajas);

//sendcorreo
router.post('/api/getbodycorreo',Entrada.getbodycorreo);


module.exports = router;