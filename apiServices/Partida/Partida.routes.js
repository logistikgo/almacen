const { Router } = require('express');
const router = new Router();

const Partida = require('./Partida.controller');

router.get('/api/partidasByIDs', Partida.getPartidasByIDs);
router.get('/api/getbyid', Partida.getbyid);
router.get('/api/partida/:filtro', Partida.get);
router.get('/api/partida/entrada/:entrada_id', Partida.getByEntrada);
router.get('/api/partida/entradaSalida/:entrada_id', Partida.getByEntradaSalida);
router.get('/api/partida/salida/:salida_id', Partida.getBySalida);
router.get('/api/partida/salida/idcarga/:salida_id', Partida.getBySalidaConIDCarga);
router.put('/api/partida/saveIDCarga', Partida.saveIDCarga);
router.get('/api/partidas', Partida.getByProductoEmbalaje);
router.post('/api/partida', Partida.save);
router.get('/api/partida/pedido/get', Partida.getByPedido);
router.put('/api/partida/pedido/update', Partida._update);
router.put('/api/posicionPartida', Partida.updatePosicionPartida);
router.put('/api/partida/updateCajasPedidas', Partida.updateCajasPedidas);
router.post('/api/posicionarPartidas', Partida.posicionarPartidas);
router.get('/api/getPartidaMod', Partida.getPartidaMod);
router.post('/api/ModificaPartidas', Partida.ModificaPartidas);
router.post('/api/LimpiaPosicion', Partida.LimpiaPosicion);
router.post('/api/removerPartidasEnCero', Partida.removePartidasWithZeroQuantity);
router.get('/api/getPartidasMod/:idClienteFiscal', Partida.getPartidaMod);
router.get('/api/verificarPartidasSalidas/:salida_id', Partida.verificarPartidasSalidas);

//router.get('/api/partida', Entrada.getPartidaById);
//router.put('/api/partida', Entrada.updatePartida);
//router.get('/api/partidas/:producto_id/:embalaje/:cantidad',Partida.getByProductoEmbalaje);
// router.put('/api/partida/:_id', Partida._put);

//router.post('/api/prepartida',PrePartida.savePartidasPedido);
// router.get('/api/prepartida',PrePartida.get);
// router.get('/api/pedidosPosicionados',PrePartida.getPedidosPosicionados);
// router.post('/api/updatePartidasSalida',Salida.updatePartidasSalidaAPI);

module.exports = router;