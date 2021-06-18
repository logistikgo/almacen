const { Router } = require('express');
const router = new Router();

const Usuario = require('./Usuario.controller');

router.get('/api/getUsuarios', Usuario.get);
router.get('/api/getUsuario/:idusuario', Usuario.getByIDUsuario);
router.post('/api/saveUsuario', Usuario.save);
router.post('/api/deleteUsuario', Usuario._delete);
router.post('/api/updateUsuario', Usuario.update);

module.exports = router;
