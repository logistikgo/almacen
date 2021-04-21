const { Router } = require('express');
const router = new Router();

const Evidencia = require('./Evidencia.controller');

router.post('/api/evidencia', Evidencia.saveEvidencia);
router.get('/api/evidencias', Evidencia.getEvidenciasByID);
router.delete('/api/evidencia', Evidencia.deleteEvidencia);

module.exports = router;