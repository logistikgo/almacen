//Import Routes
const ProductoRouter = require('../apiServices/Producto/Producto.routes');
const UsuarioRouter = require('../apiServices/Usuario/Usuario.routes');
const MovimientosInventarioRouter = require('../apiServices/MovimientosInventario/MovimientosInventario.routes');
const EntradaRouter = require('../apiServices/Entradas/Entrada.routes');
const SalidaRouter = require('../apiServices/Salidas/Salida.routes');
const ClienteFiscalRouter = require('../apiServices/ClientesFiscales/ClienteFiscal.routes');
const SucursalRouter = require('../apiServices/Sucursal/Sucursal.routes');
const AlmacenRouter = require('../apiServices/Almacenes/Almacen.routes');
const EvidenciaRouter = require('../apiServices/Evidencia/Evidencia.routes');
const PosicionRouter = require('../apiServices/Posicion/Posicion.routes');
const PasilloRouter = require('../apiServices/Pasillos/Pasillo.routes');
const EmbalajeRouter = require('../apiServices/Embalaje/Embalaje.routes');
const PresentacionRouter = require('../apiServices/Presentacion/Presentacion.routes');
const ColumnasxUsuarioRouter = require('../apiServices/ColumnasxUsuario/ColumnasxUsuario.routes');
const ColumnasxOperacionRouter = require('../apiServices/ColumnanasxOperacion/ColumnasxOperacion.routes');
const PartidaRouter = require('../apiServices/Partida/Partida.routes');
const TarifaPESRouter = require('../apiServices/TarifaPES/TarifaPES.routes');
const TarifaFactorRouter = require('../apiServices/TarifaFactor/TarifaFactor.routes');
const TarifaDXPRouter = require('../apiServices/TarifaDXP/TarifaDXP.routes');
const FolioIngresoRouter = require('../apiServices/FolioIngreso/FolioIngreso.routes');
const TiempoCargaDescargaRouter = require('../apiServices/TiempoCargaDescarga/TiempoCargaDescarga.routes');
const ClasificacionesProductosRouter = require('../apiServices/ClasificacionesProducto/ClasificacionesProducto.routes');
const CostoDXPRouter = require('../apiServices/CostoDXP/CostoDXP.routes');
const CostoFactorRouter = require('../apiServices/CostoFactor/CostoFactor.routes');
const CostoFijaRouter = require('../apiServices/CostoFija/CostoFija.routes');
const CostoPESRouter = require('../apiServices/CostoPES/CostoPES.routes');
const PlantaProductoRouter = require('../apiServices/PlantaProductora/PlantaProductora.routes');
const TicketRouter = require('../apiServices/Ticket/Ticket.routes');
const EntradaBabelRouter = require('../apiServices/EntradasBabel/EntradaBabel.routes');
const SalidaBabelRouter = require('../apiServices/SalidasBabel/SalidaBabel.routes');
const ReporteExcelRouter = require('../apiServices/ReportesExcel/ReporteExcel.routes');
const ModificacionesRouter = require('../apiServices/Modificaciones/Modificaciones.routes');
const ReenvioPedidosBitacoraRouter = require('../apiServices/ReenvioPedidosBitacora/ReenvioPedidosBitacora.routes');
const Interfaz_ALM_XDRouter = require('../apiServices/Interfaz_ALM_XD/Interfaz_ALM_XD.routes');
const HelperRouter = require('../apiServices/Helper/Helper.routes');
const EntradaMirageHandHeldRouter = require('../apiServices/EntradaMirageHandHeld/EntradaMirageHandHeld.routes');
const middleware = require('../middlewares/middleware');


module.exports = (app, express) => {

    //Middlewares
    middleware(app, express);
    //Use routes in router
    app.use(ProductoRouter);
    app.use(UsuarioRouter);
    app.use(MovimientosInventarioRouter);
    app.use(EntradaRouter);
    app.use(EntradaBabelRouter);
    app.use(SalidaRouter);
    app.use(SalidaBabelRouter);
    app.use(ClienteFiscalRouter);
    app.use(SucursalRouter);
    app.use(AlmacenRouter);
    app.use(PasilloRouter);
    app.use(EvidenciaRouter);
    app.use(PosicionRouter);
    app.use(EmbalajeRouter);
    app.use(PresentacionRouter);
    app.use(ColumnasxUsuarioRouter)
    app.use(ColumnasxOperacionRouter);
    app.use(PartidaRouter);
    app.use(TarifaPESRouter);
    app.use(TarifaFactorRouter);
    app.use(TarifaDXPRouter);
    app.use(FolioIngresoRouter);
    app.use(TiempoCargaDescargaRouter);
    app.use(ClasificacionesProductosRouter);
    app.use(CostoDXPRouter);
    app.use(CostoFactorRouter);
    app.use(CostoFijaRouter);
    app.use(CostoPESRouter);
    app.use(PlantaProductoRouter);
    app.use(TicketRouter);
    app.use(ReporteExcelRouter);
    app.use(ModificacionesRouter);
    app.use(ReenvioPedidosBitacoraRouter);
    app.use(Interfaz_ALM_XDRouter);
    app.use(HelperRouter);
    app.use(EntradaMirageHandHeldRouter);

}