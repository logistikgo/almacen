const { Router } = require('express');
const router = new Router();

const ClienteFiscal = require('./ClienteFiscal.controller');
const Helper = require('../../services/utils/helpers');

router.get('/api/getCtesFiscales', ClienteFiscal.get);
router.get('/api/getCtesFiscalesXD', Helper.getClientesFiscalesXD);
router.get('/api/clienteFiscal', ClienteFiscal.getByIDClienteFiscal);
router.post('/api/saveCteFiscal', ClienteFiscal.save);
router.delete('/api/deleteCteFiscal', ClienteFiscal._delete);
router.put('/api/clienteFiscal', ClienteFiscal.update);
router.get('/api/getCteFiscalByTarifa/:tipoTarifaPrecio', ClienteFiscal.getByTarifa);
router.post('/api/getValidacionCliente', ClienteFiscal.getValidacionCliente);
router.post('/api/gethideColumns', ClienteFiscal.gethideColumns);

module.exports = router;