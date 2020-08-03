const util = require('util')


const addressRegex = /([0-9A-F]{4}:){3}[0-9A-F]{4}/i;


const directions = [
{'name': 'N', range:  [348.75, 11.25]},
{'name': 'NNE', range:  [11.25, 33.75]},
{'name': 'NE', range:  [33.75, 56.25]},
{'name': 'ENE', range:  [56.25, 78.75]},
{'name': 'E', range:  [78.75, 101.25]},
{'name': 'ESE', range:  [101.25, 123.75]},
{'name': 'SE', range:  [123.75, 146.25]},
{'name': 'SSE', range:  [146.25, 168.75]},
{'name': 'S', range:  [168.75, 191.25]},
{'name': 'SSW', range:  [191.25, 213.75]},
{'name': 'SW', range:  [213.75, 236.25]},
{'name': 'WSW', range:  [236.25, 258.75]},
{'name': 'W', range:  [258.75, 281.25]},
{'name': 'WNW', range:  [281.25, 303.75]},
{'name': 'NW', range:  [303.75, 326.25]},
{'name': 'NNW', range:  [326.25, 348.75]},
];

function decodeHexAddress(hexAddress) {
	const parts = hexAddress.match(/[0-9A-F]+/ig)
	let ret = {
		x: parseInt(parts[0], 16),
		y: parseInt(parts[1], 16),
		z: parseInt(parts[2], 16),
		system: parseInt(parts[3], 16),
		planet: 0
	}
	ret.coords = {
		x: ret.x - 2047,
		y: ret.y - 127,
		z: ret.z - 2047,
	}
	ret.voxel = {
		x: voxelShift(ret.x, 2047, 0xFFF),
		y: voxelShift(ret.y, 127, 0xFF),
		z: voxelShift(ret.z, 2047, 0xFFF),
	}
	return ret
}

function portalCode(decoded) {
	var ret = ""
	ret += Number(decoded.planet).toString(16)
	ret += Number(decoded.system).toString(16).padStart(3, '0')
	ret += voxelShift(decoded.y, 127, 0xFF).toString(16).padStart(2, '0')
	ret += voxelShift(decoded.z, 2047, 0xFFF).toString(16).padStart(3, '0')
	ret += voxelShift(decoded.x, 2047, 0xFFF).toString(16).padStart(3, '0')
	return ret.toUpperCase()
}

function voxelShift(val, ofs, max) {
	var ret = Number(val - ofs)
	return (ret < 0) ? (max + ret+1) : ret;
}

function glyphEmojis(code) {
	var ret = []
	for (var i = 0; i < code.length; i++) {
		var char = code.charAt(i);
		var glyph = `glyph${char.toUpperCase()}`
		const emoji = lookupEmoji(glyph)
		if (emoji) {
			ret.push(emoji.toString())
		} else {
			console.log(`err: ${char} ${glyph}`)
		}
	}
	return ret.join("")
}

function distanceFromCore(decoded) {
	return Math.sqrt(Math.pow(decoded.coords.x,2) + Math.pow(decoded.coords.y,2) + Math.pow(decoded.coords.z,2))*400 / 1000
}

function compassBearing(decoded) {
	let phideg = Math.atan2(decoded.coords.z, decoded.coords.x)*180/Math.PI;
	phideg = phideg+90 % 360
	console.log("phideg", phideg)
	for (var i=0; i < directions.length; i++) {
		const dir = directions[i];
		if (dir.name == 'N' && (phideg >= dir.range[0] || phideg < dir.range[1])) {
			return dir.name
		}
		else
		if (phideg >= dir.range[0] && phideg < dir.range[1]) {
			return dir.name
		}
	}
}

/*
	function lookupEmoji(name) {
		return name;
	}

function test()
{

	// const hexAddress = "0D60:0081:0C7E:0120"
	const hexAddress = "042F:0078:0D56:0000"
	let decoded = decodeHexAddress(hexAddress)
	let code = portalCode(decoded)
	let emojis = glyphEmojis(code)

	console.log(util.inspect(decoded))
	console.log(`${hexAddress} -- ${code}`)
	console.log(`${emojis}`)
}


test()
*/


const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client();
client.login(config.BOT_TOKEN);


function lookupEmoji(name) {
	return client.emojis.cache.find(emoji => emoji.name === name)
}

client.on("message", function(message) {
	if (message.author.bot) return;

	matches = message.content.match(addressRegex)
	if (matches) {
		// message contains a galactic address
		let hexAddress = matches[0];
		let decoded = decodeHexAddress(hexAddress)
		console.log(util.inspect(decoded))

		let code = portalCode(decoded)
		console.log(`${hexAddress} -- ${code}`)

		let distance = distanceFromCore(decoded).toFixed(3)
		let bearing = compassBearing(decoded)

		let emojis = glyphEmojis(code)
		message.reply(`${hexAddress} {x:${decoded.coords.x}, y:${decoded.coords.y}, z:${decoded.coords.z}}\n${bearing} ${distance}kly\n${emojis}`)
	}
})


