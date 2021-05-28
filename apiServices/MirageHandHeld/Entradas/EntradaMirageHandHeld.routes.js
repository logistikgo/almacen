const { Router } = require('express');
const router = new Router();

const EntradaMirgageHandHeld = require('./EntradaMirageHandHeld.controller');


router.post('/api/entradas/miragehandheld', EntradaMirgageHandHeld.entradaMirageHandHeld);

module.exports = router;

