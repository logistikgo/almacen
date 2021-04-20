const { Router } = require('express');
const router = new Router();

const ColumnasxUsuario = require('./ColumnasxUsuario.controller');

router.get('/api/columnas', ColumnasxUsuario.getColumns);

module.exports = router;