async function getNextID(dataContext, field){
	let max = 0;
	let lastUser = await dataContext.find().sort([[field,-1]]).exec();
	
	if(lastUser.length > 0)
		max = (lastUser[0])[field];

	console.log(max);

	return max + 1;
}

module.exports = {
	getNextID
}