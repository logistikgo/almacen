const { Router } = require('express');
const router = new Router();

const ColumnasxOperacion = require('./ColumnasxOperacion.controller');

router.get('/api/columnasOperacion/:idTable/:clienteFiscal_id/:sucursal_id/:almacen_id', ColumnasxOperacion.get);

module.exports = router;


