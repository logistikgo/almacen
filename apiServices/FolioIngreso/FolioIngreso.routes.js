const { Router } = require('express');
const router = new Router();

const FolioIngreso = require('./FolioIngreso.controller');

router.get('/api/foliosIngresos', FolioIngreso.get);
router.post('/api/folioIngreso', FolioIngreso.save);
router.put('/api/folioIngreso/:_id', FolioIngreso.update);
router.delete('/api/folioIngreso/:_id', FolioIngreso._delete);

module.exports = router;
