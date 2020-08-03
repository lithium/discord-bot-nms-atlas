const util = require('util')


const addressRegex = /([0-9A-F]{4}:){3}[0-9A-F]{4}/i;


const directions = [
	{'name': 'East', range:  [0, 11.25], bearing: 0},
	{'name': 'Delta East', range:  [11.25, 33.75], bearing: 22.5},
	{'name': 'Delta South', range:  [56.25, 78.75], bearing: 67.5},
	{'name': 'Delta', range:  [33.75, 56.25], bearing: 45},
	{'name': 'South', range:  [78.75, 101.25], bearing: 90},
	{'name': 'Gamma South', range:  [101.25, 123.75], bearing: 112.5},
	{'name': 'Gamma West', range:  [146.25, 168.75], bearing: 157.5},
	{'name': 'Gamma', range:  [123.75, 146.25], bearing: 135},
	{'name': 'West', range:  [168.75, 191.25], bearing: 180},
	{'name': 'Alpha West', range:  [191.25, 213.75], bearing: 202.5},
	{'name': 'Alpha North', range:  [236.25, 258.75], bearing: 247.5},
	{'name': 'Alpha', range:  [213.75, 236.25], bearing: 225},
	{'name': 'North', range:  [258.75, 281.25], bearing: 270},
	{'name': 'Beta North', range:  [281.25, 303.75], bearing: 292.5},
	{'name': 'Beta East', range:  [326.25, 348.75], bearing: 337.5},
	{'name': 'Beta', range:  [303.75, 326.25], bearing: 315},
	{'name': 'East', range:  [348.75, 360.1], bearing: 0},
];





function decodeHexAddress(hexAddress) {
	const parts = hexAddress.match(/[0-9A-F]+/ig)
	let ret = {
		hexAddress: hexAddress,
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
	let phideg = phideg1 < 0 ? 360+phideg1 : phideg1 // clamp to 0..360
	// let phideg = phideg2+90 % 360 // rotate 90 degrees
	// console.log("phi", phideg1, phideg2, phideg)
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



function parse_address(message) {
	let parts = message.content.split(/\s+/)
	var msg = parts.slice(1).join(' ').toLowerCase()
	var parsed = {
		direction: undefined,
		system: 1, 
		planet: 1,
	}

	// parse direction
	for (var i=0; i < directions.length; i++) {
		var dir = directions[i];
		var match = dir.name.toLowerCase()+' '
		if (msg.startsWith(match)) {
			parsed.direction = dir
			msg = msg.replace(match, '')
			break;
		}
	}


	let remain = msg.split(/\s+/)

	var dist = remain.shift()
	if (dist) {
		parsed.distance = Number(dist.toLowerCase().replace("kly", ""))*1000 / 400  // convert to region coordinates
	}

	var system = remain.shift()
	if (system) {
		parsed.system = Number(system.toLowerCase().replace("system=", ""))
	}

	var planet = remain.shift()
	if (planet) {
		parsed.planet = Number(planet.toLowerCase().replace("planet=", ""))
	}


	let theta = parsed.direction.bearing * Math.PI/180
	let x = Math.round(parsed.distance * Math.cos(theta))
	let z = Math.round(parsed.distance * Math.sin(theta))
	let y = 0
	parsed.portal = {
		x: x, 
		y: y,
		z: z
	}
	parsed.galactic = {
		x: x + 2047,
		y: y + 127,
		z: z + 2047,
	}
	parsed.voxel = {
		x: voxelShift(parsed.galactic.x, 2047, 0xFFF),
		y: voxelShift(parsed.galactic.y, 127, 0xFF),
		z: voxelShift(parsed.galactic.z, 2047, 0xFFF),
	}
	parsed.hexAddress = 
		parsed.galactic.x.toString(16).padStart(4, '0') + ':' +
		parsed.galactic.y.toString(16).padStart(4, '0') + ':' +
		parsed.galactic.z.toString(16).padStart(4, '0') + ':' +
		parsed.system.toString(16).padStart(4, '0');
	return parsed
}


function build_reply(decoded) {
	let code = portalCode(decoded)
	let distance = distanceFromCore(decoded).toFixed(3)
	let bearing = compassBearing(decoded)
	let plane = planeLocation(decoded)

	let emojis = glyphEmojis(code)
	return `${decoded.hexAddress} {x:${decoded.portal.x}, y:${decoded.portal.y}, z:${decoded.portal.z}, system:${decoded.system}}\n${plane}${bearing} ${distance}kly\n${emojis}`;
}


/*
function lookupEmoji(name) {
	return `:${name}:`;
}

function test()
{

	// const hexAddress = "0D60:0081:0C7E:0120"
	// const hexAddress = "042F:0078:0D56:0000"
	// const hexAddress = "07FF:007F:03E5:0001"
	const hexAddress = "07FF:007F:0FFE:0001"
	let decoded = decodeHexAddress(hexAddress)
	let code = portalCode(decoded)
	let distance = distanceFromCore(decoded).toFixed(3)
	let bearing = compassBearing(decoded)
	let plane = planeLocation(decoded)

	console.log(util.inspect(decoded))
	console.log(`${hexAddress} -- ${code}`)
	console.log(`distance= ${distance}`)
	console.log(`bearing= ${bearing}`)
	console.log(`plane= ${plane}`)
}
function test2() {
	let decoded = parse_address({content: "!address delta east 420kly system=420"})
	console.log(util.inspect(decoded))
	reply = build_reply(decoded)
	console.log(reply)
}


test2()


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

	let parts = message.content.split(/\s+/)
	if (parts[0] == '!portal') {
		let code = parts[1]
		let emojis = glyphEmojis(code)
		message.reply(`${code}\n${emojis}`)
		return;
	}
	else 
	if (parts[0] == '!address') {
		var hunk = parts.slice(1,-1).join(' ').toLowerCase()
		let decoded = parse_address(message)
		message.reply(build_reply(decoded))
		return;
	}

	// match a galactic address anywhere
	matches = message.content.match(addressRegex)
	if (matches) {
		// message contains a galactic address
		let hexAddress = matches[0];
		let decoded = decodeHexAddress(hexAddress)
		message.reply(build_reply(decoded))
	}
})


