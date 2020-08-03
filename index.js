const util = require('util')


const addressRegex = /([0-9A-F]{4}:){3}[0-9A-F]{4}/i;


const directions = [
{'name': 'North', range:  [0, 11.25]},
{'name': 'North Beta', range:  [11.25, 33.75]},
{'name': 'Beta', range:  [33.75, 56.25]},
{'name': 'East Beta', range:  [56.25, 78.75]},
{'name': 'East', range:  [78.75, 101.25]},
{'name': 'East Gamma', range:  [101.25, 123.75]},
{'name': 'Gamma', range:  [123.75, 146.25]},
{'name': 'South Gamma', range:  [146.25, 168.75]},
{'name': 'South', range:  [168.75, 191.25]},
{'name': 'South Delta', range:  [191.25, 213.75]},
{'name': 'Delta', range:  [213.75, 236.25]},
{'name': 'West Delta', range:  [236.25, 258.75]},
{'name': 'West', range:  [258.75, 281.25]},
{'name': 'West Alpha', range:  [281.25, 303.75]},
{'name': 'Alpha', range:  [303.75, 326.25]},
{'name': 'North Alpha', range:  [326.25, 348.75]},
{'name': 'North', range:  [348.75, 360.0]},
];

function decodeHexAddress(hexAddress) {
	const parts = hexAddress.match(/[0-9A-F]+/ig)
	let ret = {
		galactic: {
			x: parseInt(parts[0], 16),
			y: parseInt(parts[1], 16),
			z: parseInt(parts[2], 16),
		},
		system: parseInt(parts[3], 16),
		planet: 0
	}
	ret.portal = {
		x: ret.galactic.x - 2047,
		y: ret.galactic.y - 127,
		z: ret.galactic.z - 2047,
	}
	ret.voxel = {
		x: voxelShift(ret.galactic.x, 2047, 0xFFF),
		y: voxelShift(ret.galactic.y, 127, 0xFF),
		z: voxelShift(ret.galactic.z, 2047, 0xFFF),
	}
	return ret
}

function portalCode(decoded) {
	var ret = ""
	ret += Number(decoded.planet).toString(16)
	ret += Number(decoded.system).toString(16).padStart(3, '0')
	ret += decoded.voxel.y.toString(16).padStart(2, '0')
	ret += decoded.voxel.z.toString(16).padStart(3, '0')
	ret += decoded.voxel.x.toString(16).padStart(3, '0')
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
	return Math.sqrt(Math.pow(decoded.portal.x,2) + Math.pow(decoded.portal.y,2) + Math.pow(decoded.portal.z,2))*400 / 1000
}

function compassBearing(decoded) {
	let phideg1 = Math.atan2(decoded.portal.z, decoded.portal.x)*180/Math.PI;
	let phideg2 = phideg1 < 0 ? 360+phideg1 : phideg1 // clamp to 0..360
	let phideg = phideg2+90 % 360 // rotate 90 degrees
	for (var i=0; i < directions.length; i++) {
		const dir = directions[i];
		if (phideg < dir.range[1] && phideg >= dir.range[0]) {
			return dir.name
		}
	}
}

function planeLocation(decoded) {
	if (decoded.portal.y > 64) {
		return "Upper "
	}
	else if (decoded.portal.y < -64) {
		return "Lower "
	}
	return ""
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

	if (message.content.startsWith('!portal')) {
		let parts = message.content.split(/ /)
		let code = parts[1]
		let emojis = glyphEmojis(code)
		message.reply(`${code}\n${emojis}`)
		return;
	}

	// match a galactic address anywhere
	matches = message.content.match(addressRegex)
	if (matches) {
		// message contains a galactic address
		let hexAddress = matches[0];
		let decoded = decodeHexAddress(hexAddress)
		// console.log(util.inspect(decoded))

		let code = portalCode(decoded)
		let distance = distanceFromCore(decoded).toFixed(3)
		let bearing = compassBearing(decoded)
		let plane = planeLocation(decoded)

		let emojis = glyphEmojis(code)
		message.reply(`${hexAddress} {x:${decoded.portal.x}, y:${decoded.portal.y}, z:${decoded.portal.z}}\n${plane}${bearing} ${distance}kly\n${emojis}`)
	}
})


