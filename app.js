'use strict'

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const Helper = require('./helpers');
const Producto = require('./controllers/Producto');
const Usuario = require('./controllers/Usuario');
const Entrada = require('./controllers/Entrada');
const CteFiscal = require('./controllers/ClienteFiscal');
const MovimientosInventario = require('./controllers/MovimientoInventario');
const Salida = require('./controllers/Salida');
const Sucursal = require("./controllers/Sucursal");
const Almacen = require('./controllers/Almacen');
const Evidencia = require('./controllers/Evidencia');
const Posicion = require('./controllers/Posicion');
const Embalaje = require('./controllers/Embalaje');
const Presentacion = require('./controllers/Presentacion');
const Pasillo = require('./controllers/Pasillo');
const Partida = require('./controllers/Partida');
const ColumnasxUsuario = require("./controllers/ColumnasxUsuario");
const ColumnasxOperacion = require("./controllers/ColumnasxOperacion");
const Interfaz_ALM_XD = require('./controllers/Interfaz_ALM_XD');
const TarifaPES = require('./controllers/TarifaPES');
const TarifaFactor = require('./controllers/TarifaFactor');
const TarifaFija = require('./controllers/TarifaFija');
const TarifaDXP = require('./controllers/TarifaDXP');
const FolioIngreso = require('./controllers/FolioIngreso');
const TiempoCargaDescarga = require('./controllers/TiempoCargaDescarga');
const ClasificacionesProductos = require('./controllers/ClasificacionesProductos');
const CostoDXP = require('./controllers/CostoDXP');
const CostoFactor = require('./controllers/CostoFactor');
const CostoFija = require('./controllers/CostoFija');
const CostoPES = require('./controllers/CostoPES');
const PlantaProductora = require('./controllers/PlantaProductora');
const Ticket = require('./controllers/Ticket');
/* cors error
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());*/
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get('/api/productos', Producto.get);
app.get('/api/producto', Producto.getById);
app.get('/api/producto/:clave', Producto.getByClave);
app.get('/api/productos/:idClienteFiscal', Producto.getByIDClienteFiscal);
app.post('/api/producto', Producto.save);
app.put('/api/producto/:_id', Producto.update);
app.delete('/api/productos', Producto._delete);
app.get('/api/validaProducto/:clave', Producto.validaProducto);
app.get('/api/getProductos', Producto.getByIDsClientesFiscales);
app.get('/api/getProductosALMXD', Producto.getALM_XD);
app.get('/api/getExistenciasByAlmacen/:almacen_id/:producto_id', Producto.getExistenciasByAlmacen);
app.get('/api/getPartidasxProductoenExistencia/:producto_id', Producto.getPartidasxProductoenExistencia);
app.get('/api/getEquivalencias', Producto.getEquivalencias);

app.get('/api/movimientosInventarioByProducto', MovimientosInventario.getByProducto);
app.get('/api/posicionesxProducto', MovimientosInventario.getPosicionesByProducto);
app.get('/api/movimientosInventario', MovimientosInventario.get);
app.get('/api/movimientosInventarioByIDs', MovimientosInventario.getByIDs_cte_suc_alm);
app.post('/api/ajuste', MovimientosInventario.saveAjuste);

app.get('/api/getUsuarios', Usuario.get);
app.get('/api/getUsuario/:idusuario', Usuario.getByIDUsuario);
app.post('/api/saveUsuario', Usuario.save);
app.post('/api/deleteUsuario', Usuario._delete);
app.post('/api/updateUsuario', Usuario.update);

app.get('/api/entradas', Entrada.get);
app.get('/api/entrada', Entrada.getById);
app.get('/api/getSalidasByEntradaId', Entrada.getSalidasByEntradaID);
app.get('/api/getEntradasxRangoFechas', Entrada.getxRangoFechas);
app.get('/api/getDeliveryGroups', Helper.GetDeliveryGroups);
app.post('/api/getEntradasReporte', Entrada.getEntradasReporte);
app.put('/api/entrada', Entrada.update);
app.post('/api/entrada', Entrada.save);
app.post('/api/entradaAutomatica', Entrada.saveEntradaAutomatica);
app.post('/api/validaEntrada', Entrada.validaEntrada);
app.put('/api/updateRemision', Entrada.updateRemision);
app.put('/api/updateStatus', Entrada.updateStatus);

app.get('/api/salidas', Salida.get);
app.get('/api/salidaByID/:salida_id', Salida.getByID);
app.get('/api/getSalidasByIDs', Salida.getSalidasByIDs);
app.get('/api/getSalidasxRangoFechas', Salida.getxRangoFechas);
app.get('/api/getSalidasReporte', Salida.getReportePartidas);
app.post('/api/salida', Salida.save);
app.put('/api/salida', Salida.update);
app.post('/api/salidaAutomatica', Salida.saveSalidaAutomatica);
app.put('/api/updateStatusSalidas',Salida.updateStatusSalidas);

app.get('/api/getCtesFiscales', CteFiscal.get);
app.get('/api/getCtesFiscalesXD', Helper.getClientesFiscalesXD);
app.get('/api/clienteFiscal', CteFiscal.getByIDClienteFiscal);
app.post('/api/saveCteFiscal', CteFiscal.save);
app.delete('/api/deleteCteFiscal', CteFiscal._delete);
app.put('/api/clienteFiscal', CteFiscal.update);
app.get('/api/getCteFiscalByTarifa/:tipoTarifaPrecio', CteFiscal.getByTarifa);
app.post('/api/getValidacionCliente', CteFiscal.getValidacionCliente);
app.post('/api/gethideColumns', CteFiscal.gethideColumns);

app.get('/api/sucursales', Sucursal.get);
app.get('/api/sucursalesXD', Helper.getSucursalesXD);
app.get('/api/sucursal', Sucursal.getById);
app.get('/api/clientesxSucursal', Sucursal.getClientes);
app.post('/api/sucursal', Sucursal.save);
app.put('/api/sucursal', Sucursal.update);
app.delete('/api/sucursal', Sucursal._delete);

app.get('/api/getAlmacen/:idAlmacen', Almacen.getAlmacen);
app.get('/api/almacen', Almacen.getById);
app.get('/api/getBySurcursalClienteXD', Almacen.getBySurcursalClienteXD);
app.get('/api/almacenes', Almacen.get);
app.get('/api/almacenesCatalogo', Almacen.getCatalogo);
app.post('/api/saveAlmacen', Almacen.save);
app.put('/api/almacen', Almacen.update);
app.delete('/api/almacen', Almacen._delete);
app.get('/api/validaPosicion/:posicion/:nivel/:almacen_id', Almacen.validaPosicion);
app.get('/api/ubicaciones', Almacen.getUbicaciones);
app.get('/api/getAlmacenesFull', Almacen.getAlmacenesFull);

app.post('/api/evidencia', Evidencia.saveEvidencia);
app.get('/api/evidencias', Evidencia.getEvidenciasByID);
app.delete('/api/evidencia', Evidencia.deleteEvidencia);

app.get('/api/posiciones', Posicion.get);
app.get('/api/posicionesxPasillo', Posicion.getxPasillo);
app.get('/api/posicionesxPasilloDisponibles', Posicion.getxPasilloDisponibles);
app.get('/api/posicion', Posicion.getById);
app.get('/api/nivel', Posicion.getNivel);
app.get('/api/posicionesxProducto/:almacen_id/:producto_id', Posicion.getPosicionesxProducto)
app.get('/api/posicionAutomatica', Posicion.getPosicionAutomatica);
app.put('/api/posicion', Posicion.update);
app.delete('/api/posicion', Posicion._delete);

app.get('/api/embalajes', Embalaje.get);
app.post('/api/embalaje', Embalaje.save);
app.get('/api/embalaje', Embalaje.getById);
app.put('/api/embalaje', Embalaje.update);
app.delete('/api/embalaje', Embalaje._delete);

app.get('/api/presentaciones', Presentacion.get);
app.get('/api/presentacion', Presentacion.getById);
app.post('/api/presentacion', Presentacion.save);
app.put('/api/presentacion', Presentacion.update);
app.delete('/api/presentacion', Presentacion._delete);

app.get('/api/pasillos', Pasillo.get);
app.get('/api/pasillosDisponibles', Pasillo.getDisponibles);
app.get('/api/pasillo', Pasillo.getById);
app.get('/api/posicionesNom', Pasillo.getPosiciones);

app.get('/api/columnas', ColumnasxUsuario.getColumns);
app.get('/api/columnasOperacion/:idTable/:clienteFiscal_id/:sucursal_id/:almacen_id', ColumnasxOperacion.get);

app.get('/api/getSucursalALM', Interfaz_ALM_XD.getIDSucursalALMAPI);

app.get('/api/partidasByIDs', Partida.getPartidasByIDs);
app.get('/api/partida/:filtro', Partida.get);
app.get('/api/partida/entrada/:entrada_id', Partida.getByEntrada);
app.get('/api/partida/entradaSalida/:entrada_id', Partida.getByEntradaSalida);
app.get('/api/partida/salida/:salida_id', Partida.getBySalida);
app.get('/api/partida/salida/idcarga/:salida_id', Partida.getBySalidaConIDCarga);
app.put('/api/partida/saveIDCarga', Partida.saveIDCarga);
app.get('/api/partidas', Partida.getByProductoEmbalaje);
app.post('/api/partida', Partida.save);
app.get('/api/partida/pedido/get', Partida.getByPedido);
app.put('/api/partida/pedido/update', Partida._update);
app.put('/api/posicionPartida', Partida.updatePosicionPartida)
app.put('/api/partida/updateCajasPedidas', Partida.updateCajasPedidas);

//app.get('/api/partida', Entrada.getPartidaById);
//app.put('/api/partida', Entrada.updatePartida);
//app.get('/api/partidas/:producto_id/:embalaje/:cantidad',Partida.getByProductoEmbalaje);
// app.put('/api/partida/:_id', Partida._put);

//app.post('/api/prepartida',PrePartida.savePartidasPedido);
// app.get('/api/prepartida',PrePartida.get);
// app.get('/api/pedidosPosicionados',PrePartida.getPedidosPosicionados);
// app.post('/api/updatePartidasSalida',Salida.updatePartidasSalidaAPI);

//Tarifas
app.get('/api/tarifaPES', TarifaPES.get);
app.get('/api/tarifaPES/:_id', TarifaPES.getByID);
app.get('/api/tarifaPES/cliente/:cliente_id', TarifaPES.getByCliente);
app.post('/api/tarifaPES', TarifaPES.post);
app.put('/api/tarifaPES/:_id', TarifaPES.put);
app.delete('/api/tarifaPES/:_id', TarifaPES._delete);

app.get('/api/tarifaFactor', TarifaFactor.get);
app.get('/api/tarifaFactor/cliente/:cliente_id', TarifaFactor.getByCliente);
app.post('/api/tarifaFactor', TarifaFactor.post);
app.put('/api/tarifaFactor', TarifaFactor.put);
app.delete('/api/tarifaFactor/:_id', TarifaFactor._delete);

app.get('/api/tarifaFija', TarifaFija.get);
app.get('/api/tarifaFija/:_id', TarifaFija.getByID);
app.get('/api/tarifaFijacliente', TarifaFija.getByCliente);
app.post('/api/tarifaFija', TarifaFija.save);
app.delete('/api/tarifaFija/:_id', TarifaFija._delete);

app.get('/api/tarifaDXP', TarifaDXP.get);
app.get('/api/tarifaDXP/:_id', TarifaDXP.getByID);
app.get('/api/tarifaDXP/cliente/:cliente_id', TarifaDXP.getByCliente);
app.post('/api/tarifaDXP', TarifaDXP.save);
app.delete('/api/tarifaDXP/:_id', TarifaDXP._delete);

app.get('/api/foliosIngresos', FolioIngreso.get);
app.post('/api/folioIngreso', FolioIngreso.save);
app.put('/api/folioIngreso/:_id', FolioIngreso.update);
app.delete('/api/folioIngreso/:_id', FolioIngreso._delete);

app.get('/api/tiemposCargaDescarga', TiempoCargaDescarga.get);
app.get('/api/tiemposCargaDescarga/:_id', TiempoCargaDescarga.getById);
app.post('/api/tiempoCargaDescarga', TiempoCargaDescarga.save);
app.put('/api/tiempoCargaDescarga/:_id', TiempoCargaDescarga.update);
app.delete('/api/tiempoCargaDescarga/:_id', TiempoCargaDescarga._delete);

app.get('/api/clasificacionesProductos', ClasificacionesProductos.get);
app.get('/api/clasificacionesProductos/:_id', ClasificacionesProductos.getById);
app.post('/api/clasificacionesProductos', ClasificacionesProductos.save);
app.put('/api/clasificacionesProductos/:_id', ClasificacionesProductos.update);
app.delete('/api/clasificacionesProductos/:_id', ClasificacionesProductos._delete);
app.get('/api/getValidaClasificacion', ClasificacionesProductos.getValidaClasificacion);

app.get('/api/costosDXP', CostoDXP.get);
app.get('/api/costoDXP/:_id', CostoDXP.getById);
app.post('/api/costoDXP', CostoDXP.save);
app.put('/api/costoDXP/:_id', CostoDXP.update);
app.delete('/api/costoDXP/:_id', CostoDXP._delete);

app.get('/api/costosFactor', CostoFactor.get);
app.get('/api/costoFactor/:_id', CostoFactor.getById);
app.post('/api/costoFactor', CostoFactor.save);
app.put('/api/costoFactor/:_id', CostoFactor.update);
app.delete('/api/costoFactor/:_id', CostoFactor._delete);

app.get('/api/costosFija', CostoFija.get);
app.get('/api/costoFija/:_id', CostoFija.getById);
app.post('/api/costoFija', CostoFija.save);
app.put('/api/costoFija/:_id', CostoFija.update);
app.delete('/api/costoFija/:_id', CostoFija._delete);

app.get('/api/costosPES', CostoPES.get);
app.get('/api/costoPES/:_id', CostoPES.getById);
app.post('/api/costoPES', CostoPES.save);
app.put('/api/costoPES/:_id', CostoPES.update);
app.delete('/api/costoPES/:_id', CostoPES._delete);
app.get('/api/getPlantaProductora',PlantaProductora.getPlantaProductora);

//excel
app.get('/api/getExcelByIDs', Partida.getExcelByIDs);
app.get('/api/getExcelEntradas', Entrada.getExcelEntradas);
app.get('/api/getExcelCaducidades', Entrada.getExcelCaducidades);
app.get('/api/getExcelSalidas', Salida.getExcelSalidas);
app.get('/api/getExcelSalidasBarcel', Salida.getExcelSalidasBarcel);
app.get('/api/reporteDia',Partida.reporteDia);
app.get('/api/getExcelreporteDia',Partida.getExcelreporteDia);


//babel
//entradas
app.post('/api/saveEntradaBabel', Entrada.saveEntradaBabel);
app.post('/api/updateEntradasBabel', Entrada.updateEntradasBabel);
app.post('/api/saveEntradaEDI', Entrada.saveEntradaEDI);
app.post('/api/updateById', Entrada.updateById);

app.post('/api/saveEntradaChevron',Entrada.saveEntradaChevron);

 //salidas
app.post('/api/saveSalidaBabel', Salida.saveSalidaBabel);

//PosicionamentoAuto
app.post('/api/posicionarPrioridades', Entrada.posicionarPrioridades);
//gettotalcajas
app.get('/api/getTarimasAndCajas/:_id', Entrada.getTarimasAndCajas);

//Tickets
app.post('/api/saveTicket', Ticket.post);
app.post('/api/getTickets', Ticket.get);
app.get('/api/getTicketByID', Ticket.getByID);
app.post('/api/aprobarTicket', Ticket.liberarTicket);

//reprotesCheat
app.post('/api/importsalidas',Salida.importsalidas);
app.post('/api/saveEntradaPisa',Entrada.saveEntradaPisa);

//sendcorreo
app.post('/api/getbodycorreo',Entrada.getbodycorreo);


module.exports = app;