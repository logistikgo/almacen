const { Router } = require('express');
const router = new Router();

const SalidaMirgageHandHeld = require('./SalidaMirageHandHeld.controller');

router.post('/api/salidas/miragehandheld', SalidaMirgageHandHeld.salidaMirageHandHeld);

module.exports = router;