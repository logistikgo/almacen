const app = require('./app');


function initServer({port, currentEnv}){
    app.listen(port, () => {
        console.log(`API FUNCIONANDO EN EL PUERTO: ${port} EN EL AMBIENTE DE: ${currentEnv}`)
    });
}

module.exports = {
    initServer
};


