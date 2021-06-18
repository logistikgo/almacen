const { Router } = require('express');
const router = new Router();

const Embalaje = require('./Embalaje.controller');

router.get('/api/embalajes', Embalaje.get);
router.post('/api/embalaje', Embalaje.save);
router.get('/api/embalaje', Embalaje.getById);
router.put('/api/embalaje', Embalaje.update);
router.delete('/api/embalaje', Embalaje._delete);

module.exports = router;