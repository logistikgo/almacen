const { Router } = require('express');
const router = new Router();

const Salida = require('../Salidas/Salida.controller');
const Entrada = require('../Entradas/Entrada.controller');
const Partida = require('../Partida/Partida.controller');

//excel
router.get('/api/getExcelByIDs', Partida.getExcelByIDs);
router.get('/api/getExcelEntradas', Entrada.getExcelEntradas);
router.get('/api/getExcelCaducidades', Entrada.getExcelCaducidades);
router.get('/api/getExcelSalidas', Salida.getExcelSalidas);
router.get('/api/getExcelSalidasBarcel', Salida.getExcelSalidasBarcel);
router.get('/api/reporteDia',Partida.reporteDia);
router.get('/api/getExcelreporteDia',Partida.getExcelreporteDia);
router.get('/api/reporteFEFOS',Partida.reporteFEFOS);
router.get('/api/getExcelInventory', Partida.getExcelInventory);
router.get('/api/getExcelModificaciones',Partida.getPartidaModExcel);

module.exports = router;