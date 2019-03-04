///////////////////////////////////////////////////////////////////////////////
//  Cyber Mega Phone 2K
//  Copyright (C) 2017 Digium, Inc.
//
//  This program is free software, distributed under the terms of the
//  MIT License. See the LICENSE file at the top of the source tree.
///////////////////////////////////////////////////////////////////////////////

'use_strict';

// Turn on jssip debugging by un-commenting the below:
//JsSIP.debug.enable('JsSIP:*');

let isFirefox = typeof InstallTrigger !== 'undefined';
let isChrome = !!window.chrome && !!window.chrome;

function CyberMegaPhone(id, name, password, host, register, audio=true, video=true) {
	EasyEvent.call(this);
	this.id = id;
	this.name = name;
	this.password = password;
	this.host = host;
	this.register = register;
	this.audio = audio;
	this.video = video;

	this._locals = new Streams();
	this._locals.bubble("streamAdded", this);
	this._locals.bubble("streamRemoved", this);

	this._remotes = new Streams();
	this._remotes.bubble("streamAdded", this);
	this._remotes.bubble("streamRemoved", this);
};

CyberMegaPhone.prototype = Object.create(EasyEvent.prototype);
CyberMegaPhone.prototype.constructor = CyberMegaPhone;

// This was taken from the WebRTC unified transition guide located at
// https://docs.google.com/document/d/1-ZfikoUtoJa9k-GZG1daN0BU3IjIanQ_JSscHxQesvU/edit
function isUnifiedPlanDefault() {
	// Safari supports addTransceiver() but not Unified Plan when
	// currentDirection is not defined.
	if (!('currentDirection' in RTCRtpTransceiver.prototype))
		return false;

	// If Unified Plan is supported, addTransceiver() should not throw.
	const tempPc = new RTCPeerConnection();
	let canAddTransceiver = false;
	try {
		tempPc.addTransceiver('audio');
		canAddTransceiver = true;
	} catch (e) {
	}

	tempPc.close();
	return canAddTransceiver;
}

CyberMegaPhone.prototype.connect = function () {
	if (this._ua) {
		this._ua.start(); // Just reconnect
		return;
	}

	let that = this;

	let socket = new JsSIP.WebSocketInterface('wss://' + this.host + ':8089/ws');
	let uri = 'sip:' + this.id + '@' + this.host;

	let config = {
		sockets: [ socket ],
		uri: uri,
		contact_uri: uri,
		username: this.name ? this.name : this.id,
		password: this.password,
		register: this.register,
		register_expires : 300
	};

	this._unified = isUnifiedPlanDefault();

	this._ua = new JsSIP.UA(config);

	function bubble (obj, name) {
		obj.on(name, function (data) {
			that.raise(name, data);
		});
	};

	bubble(this._ua, 'connected');
	bubble(this._ua, 'disconnected');
	bubble(this._ua, 'registered');
	bubble(this._ua, 'unregistered');
	bubble(this._ua, 'registrationFailed');

	this._ua.on('newRTCSession', function (data) {
		let rtc = data.session;
		rtc.interop = new SdpInterop.InteropChrome();

		console.log('new session - ' + rtc.direction + ' - ' + rtc);

		rtc.on("confirmed", function () {
			// ACK was received
			let streams = rtc.connection.getLocalStreams();
			for (let i = 0; i < streams.length; ++i) {
				console.log('confirmed: adding local stream ' + streams[i].id);
				streams[i].local = true;
				that._locals.add(streams[i]);
			}
		});

		rtc.on("sdp", function (data) {
			if (isFirefox && data.originator === 'remote') {
				data.sdp = data.sdp.replace(/actpass/g, 'active');
			} else if (isChrome && !that._unified) {
				let desc = new RTCSessionDescription({type:data.type, sdp:data.sdp});
				if (data.originator === 'local') {
					converted = rtc.interop.toUnifiedPlan(desc);
				} else {
					converted = rtc.interop.toPlanB(desc);
				}

				data.sdp = converted.sdp;
			}
		});

		bubble(rtc, 'muted');
		bubble(rtc, 'unmuted');
		bubble(rtc, 'failed');
		bubble(rtc, 'ended');

		rtc.connection.ontrack = function (event) {
			console.log('ontrack: ' + event.track.kind + ' - ' + event.track.id +
						' stream ' + event.streams[0].id);
			if (event.track.kind == 'video') {
				event.track.enabled = false;
			}
			for (let i = 0; i < event.streams.length; ++i) {
				event.streams[i].local = false;
				that._remotes.add(event.streams[i]);
			}
		};

		rtc.connection.onremovestream = function (event) {
			console.log('onremovestream: ' + event.stream.id);
			that._remotes.remove(event.stream);
		};

		if (data.originator === "remote") {
			that.raise('incoming', data.request.ruri.toAor());
		}
	});

	this._ua.start();
};

CyberMegaPhone.prototype.disconnect = function () {
	this._locals.removeAll();
	this._remotes.removeAll();
	if (this._ua) {
		this._ua.stop();
	}
};

CyberMegaPhone.prototype.answer = function () {
	if (!this._ua) {
		return;
	}

	let options = {
		'mediaConstraints': { 'audio': this.audio, 'video': this.video }
	};

	this._rtc.answer(options);
};

CyberMegaPhone.prototype.call = function (exten) {
	if (!this._ua || !exten) {
		return;
	}

	let options = {
		'mediaConstraints': { 'audio': this.audio, 'video': this.video }
	};

	if (exten.startsWith('sip:')) {
		this._rtc = this._ua.call(exten);
	} else {
		this._rtc = this._ua.call('sip:' + exten + '@' + this.host, options);
	}
};

CyberMegaPhone.prototype.terminate = function () {
	this._locals.removeAll();
	this._remotes.removeAll();
	if (this._ua) {
		this._rtc.terminate();
	}
};

///////////////////////////////////////////////////////////////////////////////

function mute(stream, options) {

	function setTracks(tracks, val) {
		if (!tracks) {
			return;
		}

		for (let i = 0; i < tracks.length; ++i) {
			if (tracks[i].enabled == val) {
				tracks[i].enabled = !val;
			}
		}
	};

	options = options || { audio: true, video: true };

	if (typeof options.audio != 'undefined') {
		setTracks(stream.getAudioTracks(), options.audio);
	}

	if (typeof options.video != 'undefined') {
		setTracks(stream.getVideoTracks(), options.video);
	}
}

function unmute(stream, options) {
	let opts = options || { audio: false, video: false };
	mute(stream, opts);
}

///////////////////////////////////////////////////////////////////////////////

function Streams () {
	EasyEvent.call(this);
	this._streams = [];
};

Streams.prototype = Object.create(EasyEvent.prototype);
Streams.prototype.constructor = Streams;

Streams.prototype.add = function (stream) {
	if (this._streams.indexOf(stream) == -1) {
		this._streams.push(stream);
		console.log('Streams: added ' + stream.id);
		this.raise('streamAdded', stream);
	}
};

Streams.prototype.remove = function (stream) {
	let index = typeof stream == 'number' ? stream : this._streams.indexOf(stream);

	if (index == -1) {
		return;
	}

	let removed = this._streams.splice(index, 1);
	for (let i = 0; i < removed.length; ++i) {
		console.log('Streams: removed ' + removed[i].id);
		this.raise('streamRemoved', removed[i]);
	}
};

Streams.prototype.removeAll = function () {
	for (let i = this._streams.length - 1; i >= 0 ; --i) {
		this.remove(i);
	}
};

///////////////////////////////////////////////////////////////////////////////

function EasyEvent () {
	this._events = {};
};

EasyEvent.prototype.handle = function (name, fun) {
	if (name in this._events) {
		this._events[name].push(fun);
	} else {
		this._events[name] = [fun];
	}
};

EasyEvent.prototype.raise = function (name) {
	if (name in this._events) {
		for (let i = 0; i < this._events[name].length; ++i) {
			this._events[name][i].apply(this,
					Array.prototype.slice.call(arguments, 1));
		}
	}
};

EasyEvent.prototype.bubble = function (name, obj) {
	this.handle(name, function (data) {
		obj.raise(name, data);
	});
};

EasyEvent.prototype.raiseForEach = function (name, array) {
	if (name in this._events) {
		for (let i = 0; i < array.length; ++i) {
			this.raise(name, array[i], i);
		}
	}
};
