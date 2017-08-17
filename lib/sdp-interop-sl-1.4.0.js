(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SdpInterop = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
    name: 'version',
    reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: '%s %s %d %s IP%d %s'
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: '%d %d'
  }],
  c: [{ //c=IN IP4 10.47.197.26
    name: 'connection',
    reg: /^IN IP(\d) (\S*)/,
    names: ['version', 'ip'],
    format: 'IN IP%d %s'
  }],
  b: [{ //b=AS:4000
    push: 'bandwidth',
    reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
    names: ['type', 'limit'],
    format: '%s:%s'
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
    // NB: special - pushes to session
    // TODO: rtp/fmtp should be filtered by the payloads found here?
    reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
    names: ['type', 'port', 'protocol', 'payloads'],
    format: '%s %d %s %s'
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-\.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          'rtpmap:%d %s/%s/%s':
          o.rate ?
          'rtpmap:%d %s/%s':
          'rtpmap:%d %s';
      }
    },
    { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      //a=fmtp:111 minptime=10; useinbandfec=1
      push: 'fmtp',
      reg: /^fmtp:(\d*) ([\S| ]*)/,
      names: ['payload', 'config'],
      format: 'fmtp:%d %s'
    },
    { //a=control:streamid=0
      name: 'control',
      reg: /^control:(.*)/,
      format: 'control:%s'
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          'rtcp:%d %s IP%d %s':
          'rtcp:%d';
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: 'rtcp-fb:%d trr-int %d'
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          'rtcp-fb:%s %s %s':
          'rtcp-fb:%s %s';
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:(\d+)(?:\/(\w+))? (\S*)(?: (\S*))?/,
      names: ['value', 'direction', 'uri', 'config'],
      format: function (o) {
        return 'extmap:%d' + (o.direction ? '/%s' : '%v') + ' %s' + (o.config ? ' %s' : '');
      }
    },
    { //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          'crypto:%d %s %s %s':
          'crypto:%d %s %s';
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: 'setup:%s'
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:([^\s]*)/,
      format: 'mid:%s'
    },
    { //a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
      name: 'msid',
      reg: /^msid:(.*)/,
      format: 'msid:%s'
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: 'ptime:%d'
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: 'maxptime:%d'
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
    },
    { //a=ice-lite
      name: 'icelite',
      reg: /^(ice-lite)/
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: 'ice-ufrag:%s'
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: 'ice-pwd:%s'
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: 'fingerprint:%s %s'
    },
    { //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0 network-id 3 network-cost 10
      //a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0 network-id 3 network-cost 10
      //a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0 network-id 3 network-cost 10
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'tcptype', 'generation', 'network-id', 'network-cost'],
      format: function (o) {
        var str = 'candidate:%s %d %s %d %s %d typ %s';

        str += (o.raddr != null) ? ' raddr %s rport %d' : '%v%v';

        // NB: candidate has three optional chunks, so %void middles one if it's missing
        str += (o.tcptype != null) ? ' tcptype %s' : '%v';

        if (o.generation != null) {
          str += ' generation %d';
        }

        str += (o['network-id'] != null) ? ' network-id %d' : '%v';
        str += (o['network-cost'] != null) ? ' network-cost %d' : '%v';
        return str;
      }
    },
    { //a=end-of-candidates (keep after the candidates line for readability)
      name: 'endOfCandidates',
      reg: /^(end-of-candidates)/
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: 'remote-candidates:%s'
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: 'ice-options:%s'
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: 'ssrcs',
      reg: /^ssrc:(\d*) ([\w_]*)(?::(.*))?/,
      names: ['id', 'attribute', 'value'],
      format: function (o) {
        var str = 'ssrc:%d';
        if (o.attribute != null) {
          str += ' %s';
          if (o.value != null) {
            str += ':%s';
          }
        }
        return str;
      }
    },
    { //a=ssrc-group:FEC 1 2
      //a=ssrc-group:FEC-FR 3004364195 1080772241
      push: 'ssrcGroups',
      // token-char = %x21 / %x23-27 / %x2A-2B / %x2D-2E / %x30-39 / %x41-5A / %x5E-7E
      reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,
      names: ['semantics', 'ssrcs'],
      format: 'ssrc-group:%s %s'
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: 'msidSemantic',
      reg: /^msid-semantic:\s?(\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: 'msid-semantic: %s %s' // space after ':' is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: 'group:%s %s'
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { //a=rtcp-rsize
      name: 'rtcpRsize',
      reg: /^(rtcp-rsize)/
    },
    { //a=sctpmap:5000 webrtc-datachannel 1024
      name: 'sctpmap',
      reg: /^sctpmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['sctpmapNumber', 'app', 'maxMessageSize'],
      format: function (o) {
        return (o.maxMessageSize != null) ?
          'sctpmap:%s %s %s' :
          'sctpmap:%s %s';
      }
    },
    { //a=x-google-flag:conference
      name: 'xGoogleFlag',
      reg: /^x-google-flag:([^\s]*)/,
      format: 'x-google-flag:%s'
    },
    { //a=rid:1 send max-width=1280;max-height=720;max-fps=30;depend=0
      push: 'rids',
      reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,
      names: ['id', 'direction', 'params'],
      format: function (o) {
        return (o.params) ? 'rid:%s %s %s' : 'rid:%s %s';
      }
    },
    { //a=imageattr:97 send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320] recv [x=330,y=250]
      //a=imageattr:* send [x=800,y=640] recv *
      //a=imageattr:100 recv [x=320,y=240]
      push: 'imageattrs',
      reg: new RegExp(
        //a=imageattr:97
        '^imageattr:(\\d+|\\*)' +
        //send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320]
        '[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)' +
        //recv [x=330,y=250]
        '(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?'
      ),
      names: ['pt', 'dir1', 'attrs1', 'dir2', 'attrs2'],
      format: function (o) {
        return 'imageattr:%s %s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //a=simulcast:send 1,2,3;~4,~5 recv 6;~7,~8
      //a=simulcast:recv 1;4,5 send 6;7
      name: 'simulcast',
      reg: new RegExp(
        //a=simulcast:
        '^simulcast:' +
        //send 1,2,3;~4,~5
        '(send|recv) ([a-zA-Z0-9\\-_~;,]+)' +
        //space + recv 6;~7,~8
        '(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?' +
        //end
        '$'
      ),
      names: ['dir1', 'list1', 'dir2', 'list2'],
      format: function (o) {
        return 'simulcast:%s %s' + (o.dir2 ? ' %s %s' : '');
      }
    },
    { //Old simulcast draft 03 (implemented by Firefox)
      //  https://tools.ietf.org/html/draft-ietf-mmusic-sdp-simulcast-03
      //a=simulcast: recv pt=97;98 send pt=97
      //a=simulcast: send rid=5;6;7 paused=6,7
      name: 'simulcast_03',
      reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/,
      names: ['value'],
      format: 'simulcast: %s'
    },
    {
      //a=framerate:25
      //a=framerate:29.97
      name: 'framerate',
      reg: /^framerate:(\d+(?:$|\.\d+))/,
      format: 'framerate:%s'
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ['value']
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = '%s';
    }
  });
});

},{}],2:[function(require,module,exports){
var parser = require('./parser');
var writer = require('./writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parseParams = parser.parseParams;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;
exports.parseImageAttributes = parser.parseImageAttributes;
exports.parseSimulcastStreamList = parser.parseSimulcastStreamList;

},{"./parser":3,"./writer":4}],3:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var paramReducer = function (acc, expr) {
  var s = expr.split(/=(.+)/, 2);
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseParams = function (str) {
  return str.split(/\;\s?/).reduce(paramReducer, {});
};

// For backward compatibility - alias will be removed in 3.0.0
exports.parseFmtpConfig = exports.parseParams;

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

exports.parseImageAttributes = function (str) {
  return str.split(' ').map(function (item) {
    return item.substring(1, item.length-1).split(',').reduce(paramReducer, {});
  });
};

exports.parseSimulcastStreamList = function (str) {
  return str.split(';').map(function (stream) {
    return stream.split(',').map(function (format) {
      var scid, paused = false;

      if (format[0] !== '~') {
        scid = toIntIfInt(format);
      } else {
        scid = toIntIfInt(format.substring(1, format.length));
        paused = true;
      }

      return {
        scid: scid,
        paused: paused
      };
    });
  });
};

},{"./grammar":1}],4:[function(require,module,exports){
var grammar = require('./grammar');

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
    case '%%':
      return '%';
    case '%s':
      return String(arg);
    case '%d':
      return Number(arg);
    case '%v':
      return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // 'v=0' must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = ' '; // 's= ' must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = '';
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};

},{"./grammar":1}],5:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var SdpInterop = module.exports = {
    InteropFF: require('./interop_on_ff'),
    InteropChrome: require('./interop_on_chrome'),
    transform: require('./transform')
};

},{"./interop_on_chrome":7,"./interop_on_ff":8,"./transform":11}],6:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function arrayEquals(array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!arrayEquals.apply(this[i], [array[i]]))
                return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal:
            // {x:20} != {x:20}
            return false;
        }
    }
    return true;
};


},{}],7:[function(require,module,exports){
/**
 * Copyright(c) Starleaf Ltd. 2016.
 */


"use strict";


//Small library for plan b interop - Designed to be run on chrome.
//Assumes you will do the following - convert unified plan received on the wire into plan B
//before setting the remote description
//Convert plan b generated by chrome into unified plan prior to sending.

var Interop = function () {
    var cache = {};

    var copyObj = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };

    var toUnifiedPlan = function (desc) {
        var uplan = require('./on_chrome/to-unified-plan')(desc, cache);
        //cache a copy
        cache.local = copyObj(uplan.sdp);
        return uplan;
    };

    var toPlanB = function (desc) {
        //cache the last unified plan we received on the wire
        cache.remote = copyObj(desc.sdp);
        return require('./on_chrome/to-plan-b')(desc, cache);
    };


    var that = {};
    that.toUnifiedPlan = toUnifiedPlan;
    that.toPlanB = toPlanB;
    return that;
};

module.exports = Interop;
},{"./on_chrome/to-plan-b":9,"./on_chrome/to-unified-plan":10}],8:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global RTCSessionDescription */
/* jshint -W097 */
"use strict";

var transform = require('./transform');
var arrayEquals = require('./array-equals');

function Interop() {

    /**
     * This map holds the most recent Unified Plan offer/answer SDP that was
     * converted to Plan B, with the SDP type ('offer' or 'answer') as keys and
     * the SDP string as values.
     *
     * @type {{}}
     */
    this.cache = {};
}

module.exports = Interop;

/**
 * Returns the index of the first m-line with the given media type and with a
 * direction which allows sending, in the last Unified Plan description with
 * type "answer" converted to Plan B. Returns {null} if there is no saved
 * answer, or if none of its m-lines with the given type allow sending.
 * @param type the media type ("audio" or "video").
 * @returns {*}
 */
Interop.prototype.getFirstSendingIndexFromAnswer = function (type) {
    if (!this.cache.answer) {
        return null;
    }

    var session = transform.parse(this.cache.answer);
    if (session && session.media && Array.isArray(session.media)) {
        for (var i = 0; i < session.media.length; i++) {
            if (session.media[i].type == type &&
                (!session.media[i].direction /* default to sendrecv */ ||
                session.media[i].direction === 'sendrecv' ||
                session.media[i].direction === 'sendonly')) {
                return i;
            }
        }
    }

    return null;
};

/**
 * This method transforms a Unified Plan SDP to an equivalent Plan B SDP. A
 * PeerConnection wrapper transforms the SDP to Plan B before passing it to the
 * application.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanB = function (desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    // Objectify the SDP for easier manipulation.
    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' || !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Unified Plan SDP. Plan B
    // SDP has a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function (m) {
                return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
            }
        )) {
        console.warn('This description does not look like Unified Plan.');
        return desc;
    }

    //#endregion

    // HACK https://bugzilla.mozilla.org/show_bug.cgi?id=1113443
    var sdp = desc.sdp;
    var rewrite = false;
    for (var i = 0; i < session.media.length; i++) {
        var uLine = session.media[i];
        uLine.rtp.forEach(function (rtp) {
                if (rtp.codec === 'NULL') {
                    rewrite = true;
                    var offer = transform.parse(self.cache.offer);
                    rtp.codec = offer.media[i].rtp[0].codec;
                }
            }
        );
    }
    if (rewrite) {
        sdp = transform.write(session);
    }

    // Unified Plan SDP is our "precious". Cache it for later use in the Plan B
    // -> Unified Plan transformation.
    this.cache[desc.type] = sdp;

    //#region Convert from Unified Plan to Plan B.

    // We rebuild the session.media array.
    var media = session.media;
    session.media = [];

    // Associative array that maps channel types to channel objects for fast
    // access to channel objects by their type, e.g. type2bl['audio']->channel
    // obj.
    var type2bl = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    // Implode the Unified Plan m-lines/tracks into Plan B channels.
    media.forEach(function (uLine) {

            // rtcp-mux is required in the Plan B SDP.
            if ((typeof uLine.rtcpMux !== 'string' ||
                uLine.rtcpMux !== 'rtcp-mux') &&
                uLine.direction !== 'inactive') {
                throw new Error('Cannot convert to Plan B because m-lines ' +
                    'without the rtcp-mux attribute were found.'
                );
            }

            if (uLine.type === 'application') {
                session.media.push(uLine);
                types.push(uLine.mid);
                return;
            }

            // If we don't have a channel for this uLine.type, then use this
            // uLine as the channel basis.
            if (typeof type2bl[uLine.type] === 'undefined') {
                type2bl[uLine.type] = uLine;
            }

            // Add sources to the channel and handle a=msid.
            if (typeof uLine.sources === 'object') {
                Object.keys(uLine.sources).forEach(function (ssrc) {
                        if (typeof type2bl[uLine.type].sources !== 'object')
                            type2bl[uLine.type].sources = {};

                        // Assign the sources to the channel.
                        type2bl[uLine.type].sources[ssrc] =
                            uLine.sources[ssrc];

                        if (typeof uLine.msid !== 'undefined') {
                            // In Plan B the msid is an SSRC attribute. Also, we don't
                            // care about the obsolete label and mslabel attributes.
                            //
                            // Note that it is not guaranteed that the uLine will
                            // have an msid. recvonly channels in particular don't have
                            // one.
                            type2bl[uLine.type].sources[ssrc].msid =
                                uLine.msid;
                        }
                        // NOTE ssrcs in ssrc groups will share msids, as
                        // draft-uberti-rtcweb-plan-00 mandates.
                    }
                );
            }

            // Add ssrc groups to the channel.
            if (typeof uLine.ssrcGroups !== 'undefined' &&
                Array.isArray(uLine.ssrcGroups)) {
                // Create the ssrcGroups array, if it's not defined.
                if (typeof type2bl[uLine.type].ssrcGroups === 'undefined' || !Array.isArray(type2bl[uLine.type].ssrcGroups
                    )) {
                    type2bl[uLine.type].ssrcGroups = [];
                }

                type2bl[uLine.type].ssrcGroups =
                    type2bl[uLine.type].ssrcGroups.concat(
                        uLine.ssrcGroups
                    );
            }

            if (type2bl[uLine.type] === uLine) {
                // Copy ICE related stuff from the principal media line.
                uLine.candidates = media[0].candidates;
                uLine.iceUfrag = media[0].iceUfrag;
                uLine.icePwd = media[0].icePwd;
                uLine.fingerprint = media[0].fingerprint;

                // Plan B mids are in ['audio', 'video', 'data']
                uLine.mid = uLine.type;

                // Plan B doesn't support/need the bundle-only attribute.
                delete uLine.bundleOnly;

                // In Plan B the msid is an SSRC attribute.
                delete uLine.msid;

                // Used to build the group:BUNDLE value after this loop.
                types.push(uLine.type);

                // Add the channel to the new media array.
                session.media.push(uLine);
            }
        }
    );

    // We regenerate the BUNDLE group with the new mids.
    session.groups.some(function (group) {
            if (group.type === 'BUNDLE') {
                group.mids = types.join(' ');
                return true;
            }
        }
    );

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    return new RTCSessionDescription({
            type: desc.type,
            sdp: resStr
        }
    );

    //#endregion
};

/**
 * This method transforms a Plan B SDP to an equivalent Unified Plan SDP. A
 * PeerConnection wrapper transforms the SDP to Unified Plan before passing it
 * to FF.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toUnifiedPlan = function (desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' || !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Plan B SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length > 3 || !session.media.every(function (m) {
                return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
            }
        )) {
        console.warn('This description does not look like Plan B.');
        return desc;
    }

    // Make sure this Plan B SDP can be converted to a Unified Plan SDP.
    var mids = [];
    session.media.forEach(function (m) {
            mids.push(m.mid);
        }
    );

    var hasBundle = false;
    if (typeof session.groups !== 'undefined' &&
        Array.isArray(session.groups)) {
        hasBundle = session.groups.every(function (g) {
                return g.type !== 'BUNDLE' ||
                    arrayEquals.apply(g.mids.sort(), [mids.sort()]);
            }
        );
    }

    if (!hasBundle) {
        throw new Error("Cannot convert to Unified Plan because m-lines that" +
            " are not bundled were found."
        );
    }

    //#endregion


    //#region Convert from Plan B to Unified Plan.

    // Unfortunately, a Plan B offer/answer doesn't have enough information to
    // rebuild an equivalent Unified Plan offer/answer.
    //
    // For example, if this is a local answer (in Unified Plan style) that we
    // convert to Plan B prior to handing it over to the application (the
    // PeerConnection wrapper called us, for instance, after a successful
    // createAnswer), we want to remember the m-line at which we've seen the
    // (local) SSRC. That's because when the application wants to do call the
    // SLD method, forcing us to do the inverse transformation (from Plan B to
    // Unified Plan), we need to know to which m-line to assign the (local)
    // SSRC. We also need to know all the other m-lines that the original
    // answer had and include them in the transformed answer as well.
    //
    // Another example is if this is a remote offer that we convert to Plan B
    // prior to giving it to the application, we want to remember the mid at
    // which we've seen the (remote) SSRC.
    //
    // In the iteration that follows, we use the cached Unified Plan (if it
    // exists) to assign mids to ssrcs.

    var cached;
    if (typeof this.cache[desc.type] !== 'undefined') {
        cached = transform.parse(this.cache[desc.type]);
    }

    var recvonlySsrcs = {
        audio: {},
        video: {}
    };

    // A helper map that sends mids to m-line objects. We use it later to
    // rebuild the Unified Plan style session.media array.
    var mid2ul = {};
    session.media.forEach(function (bLine) {
            if ((typeof bLine.rtcpMux !== 'string' ||
                bLine.rtcpMux !== 'rtcp-mux') &&
                bLine.direction !== 'inactive') {
                throw new Error("Cannot convert to Unified Plan because m-lines " +
                    "without the rtcp-mux attribute were found."
                );
            }

            if (bLine.type === 'application') {
                mid2ul[bLine.mid] = bLine;
                return;
            }

            // With rtcp-mux and bundle all the channels should have the same ICE
            // stuff.
            var sources = bLine.sources;
            var ssrcGroups = bLine.ssrcGroups;
            var candidates = bLine.candidates;
            var iceUfrag = bLine.iceUfrag;
            var icePwd = bLine.icePwd;
            var fingerprint = bLine.fingerprint;
            var port = bLine.port;

            // We'll use the "bLine" object as a prototype for each new "mLine"
            // that we create, but first we need to clean it up a bit.
            delete bLine.sources;
            delete bLine.ssrcGroups;
            delete bLine.candidates;
            delete bLine.iceUfrag;
            delete bLine.icePwd;
            delete bLine.fingerprint;
            delete bLine.port;
            delete bLine.mid;

            // inverted ssrc group map
            var ssrc2group = {};
            if (typeof ssrcGroups !== 'undefined' && Array.isArray(ssrcGroups)) {
                ssrcGroups.forEach(function (ssrcGroup) {

                        // TODO(gp) find out how to receive simulcast with FF. For the
                        // time being, hide it.
                        if (ssrcGroup.semantics === 'SIM') {
                            return;
                        }

                        // XXX This might brake if an SSRC is in more than one group
                        // for some reason.
                        if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                            Array.isArray(ssrcGroup.ssrcs)) {
                            ssrcGroup.ssrcs.forEach(function (ssrc) {
                                    if (typeof ssrc2group[ssrc] === 'undefined') {
                                        ssrc2group[ssrc] = [];
                                    }

                                    ssrc2group[ssrc].push(ssrcGroup);
                                }
                            );
                        }
                    }
                );
            }

            // ssrc to m-line index.
            var ssrc2ml = {};

            if (typeof sources === 'object') {

                // Explode the Plan B channel sources with one m-line per source.
                Object.keys(sources).forEach(function (ssrc) {

                        // The (unified) m-line for this SSRC. We either create it from
                        // scratch or, if it's a grouped SSRC, we re-use a related
                        // mline. In other words, if the source is grouped with another
                        // source, put the two together in the same m-line.
                        var uLine;

                        // We assume here that we are the answerer in the O/A, so any
                        // offers which we translate come from the remote side, while
                        // answers are local. So the check below is to make that we
                        // handle receive-only SSRCs in a special way only if they come
                        // from the remote side.
                        if (desc.type === 'offer') {
                            // We want to detect SSRCs which are used by a remote peer
                            // in an m-line with direction=recvonly (i.e. they are
                            // being used for RTCP only).
                            // This information would have gotten lost if the remote
                            // peer used Unified Plan and their local description was
                            // translated to Plan B. So we use the lack of an MSID
                            // attribute to deduce a "receive only" SSRC.
                            if (!sources[ssrc].msid) {
                                recvonlySsrcs[bLine.type][ssrc] = sources[ssrc];
                                // Receive-only SSRCs must not create new m-lines. We
                                // will assign them to an existing m-line later.
                                return;
                            }
                        }

                        if (typeof ssrc2group[ssrc] !== 'undefined' &&
                            Array.isArray(ssrc2group[ssrc])) {
                            ssrc2group[ssrc].some(function (ssrcGroup) {
                                    // ssrcGroup.ssrcs *is* an Array, no need to check
                                    // again here.
                                    return ssrcGroup.ssrcs.some(function (related) {
                                            if (typeof ssrc2ml[related] === 'object') {
                                                uLine = ssrc2ml[related];
                                                return true;
                                            }
                                        }
                                    );
                                }
                            );
                        }

                        if (typeof uLine === 'object') {
                            // the m-line already exists. Just add the source.
                            uLine.sources[ssrc] = sources[ssrc];
                            delete sources[ssrc].msid;
                        } else {
                            // Use the "bLine" as a prototype for the "uLine".
                            uLine = Object.create(bLine);
                            ssrc2ml[ssrc] = uLine;

                            if (typeof sources[ssrc].msid !== 'undefined') {
                                // Assign the msid of the source to the m-line. Note
                                // that it is not guaranteed that the source will have
                                // msid. In particular "recvonly" sources don't have an
                                // msid. Note that "recvonly" is a term only defined
                                // for m-lines.
                                uLine.msid = sources[ssrc].msid;
                                uLine.direction = 'sendrecv';
                                delete sources[ssrc].msid;
                            }

                            // We assign one SSRC per media line.
                            uLine.sources = {};
                            uLine.sources[ssrc] = sources[ssrc];
                            uLine.ssrcGroups = ssrc2group[ssrc];

                            // Use the cached Unified Plan SDP (if it exists) to assign
                            // SSRCs to mids.
                            if (typeof cached !== 'undefined' &&
                                typeof cached.media !== 'undefined' &&
                                Array.isArray(cached.media)) {

                                cached.media.forEach(function (m) {
                                        if (typeof m.sources === 'object') {
                                            Object.keys(m.sources).forEach(function (s) {
                                                    if (s === ssrc) {
                                                        uLine.mid = m.mid;
                                                    }
                                                }
                                            );
                                        }
                                    }
                                );
                            }

                            if (typeof uLine.mid === 'undefined') {

                                // If this is an SSRC that we see for the first time
                                // assign it a new mid. This is typically the case when
                                // this method is called to transform a remote
                                // description for the first time or when there is a
                                // new SSRC in the remote description because a new
                                // peer has joined the conference. Local SSRCs should
                                // have already been added to the map in the toPlanB
                                // method.
                                //
                                // Because FF generates answers in Unified Plan style,
                                // we MUST already have a cached answer with all the
                                // local SSRCs mapped to some m-line/mid.

                                if (desc.type === 'answer') {
                                    throw new Error("An unmapped SSRC was found.");
                                }

                                uLine.mid = [bLine.type, '-', ssrc].join('');
                            }

                            // Include the candidates in the 1st media line.
                            uLine.candidates = candidates;
                            uLine.iceUfrag = iceUfrag;
                            uLine.icePwd = icePwd;
                            uLine.fingerprint = fingerprint;
                            uLine.port = port;

                            mid2ul[uLine.mid] = uLine;
                        }
                    }
                );
            }
        }
    );

    // Rebuild the media array in the right order and add the missing mLines
    // (missing from the Plan B SDP).
    session.media = [];
    mids = []; // reuse

    if (desc.type === 'answer') {

        // The media lines in the answer must match the media lines in the
        // offer. The order is important too. Here we assume that Firefox is
        // the answerer, so we merely have to use the reconstructed (unified)
        // answer to update the cached (unified) answer accordingly.
        //
        // In the general case, one would have to use the cached (unified)
        // offer to find the m-lines that are missing from the reconstructed
        // answer, potentially grabbing them from the cached (unified) answer.
        // One has to be careful with this approach because inactive m-lines do
        // not always have an mid, making it tricky (impossible?) to find where
        // exactly and which m-lines are missing from the reconstructed answer.

        for (var i = 0; i < cached.media.length; i++) {
            var uLine = cached.media[i];

            if (typeof mid2ul[uLine.mid] === 'undefined') {

                // The mid isn't in the reconstructed (unified) answer.
                // This is either a (unified) m-line containing a remote
                // track only, or a (unified) m-line containing a remote
                // track and a local track that has been removed.
                // In either case, it MUST exist in the cached
                // (unified) answer.
                //
                // In case this is a removed local track, clean-up
                // the (unified) m-line and make sure it's 'recvonly' or
                // 'inactive'.

                delete uLine.msid;
                delete uLine.sources;
                delete uLine.ssrcGroups;
                if (!uLine.direction
                    || uLine.direction === 'sendrecv')
                    uLine.direction = 'recvonly';
                else if (uLine.direction === 'sendonly')
                    uLine.direction = 'inactive';
            } else {
                // This is an (unified) m-line/channel that contains a local
                // track (sendrecv or sendonly channel) or it's a unified
                // recvonly m-line/channel. In either case, since we're
                // going from PlanB -> Unified Plan this m-line MUST
                // exist in the cached answer.
            }

            session.media.push(uLine);

            if (typeof uLine.mid === 'string') {
                // inactive lines don't/may not have an mid.
                mids.push(uLine.mid);
            }
        }
    } else {

        // SDP offer/answer (and the JSEP spec) forbids removing an m-section
        // under any circumstances. If we are no longer interested in sending a
        // track, we just remove the msid and ssrc attributes and set it to
        // either a=recvonly (as the reofferer, we must use recvonly if the
        // other side was previously sending on the m-section, but we can also
        // leave the possibility open if it wasn't previously in use), or
        // a=inactive.

        if (typeof cached !== 'undefined' &&
            typeof cached.media !== 'undefined' &&
            Array.isArray(cached.media)) {
            cached.media.forEach(function (uLine) {
                    mids.push(uLine.mid);
                    if (typeof mid2ul[uLine.mid] !== 'undefined') {
                        session.media.push(mid2ul[uLine.mid]);
                    } else {
                        delete uLine.msid;
                        delete uLine.sources;
                        delete uLine.ssrcGroups;
                        if (!uLine.direction
                            || uLine.direction === 'sendrecv')
                            uLine.direction = 'recvonly';
                        if (!uLine.direction
                            || uLine.direction === 'sendonly')
                            uLine.direction = 'inactive';
                        session.media.push(uLine);
                    }
                }
            );
        }

        // Add all the remaining (new) m-lines of the transformed SDP.
        Object.keys(mid2ul).forEach(function (mid) {
                if (mids.indexOf(mid) === -1) {
                    mids.push(mid);
                    if (mid2ul[mid].direction === 'recvonly') {
                        // This is a remote recvonly channel. Add its SSRC to the
                        // appropriate sendrecv or sendonly channel.
                        // TODO(gp) what if we don't have sendrecv/sendonly
                        // channel?

                        session.media.some(function (uLine) {
                                if ((uLine.direction === 'sendrecv' ||
                                    uLine.direction === 'sendonly') &&
                                    uLine.type === mid2ul[mid].type) {

                                    // mid2ul[mid] shouldn't have any ssrc-groups
                                    Object.keys(mid2ul[mid].sources).forEach(
                                        function (ssrc) {
                                            uLine.sources[ssrc] =
                                                mid2ul[mid].sources[ssrc];
                                        }
                                    );

                                    return true;
                                }
                            }
                        );
                    } else {
                        session.media.push(mid2ul[mid]);
                    }
                }
            }
        );
    }

    // After we have constructed the Plan Unified m-lines we can figure out
    // where (in which m-line) to place the 'recvonly SSRCs'.
    // Note: we assume here that we are the answerer in the O/A, so any offers
    // which we translate come from the remote side, while answers are local
    // (and so our last local description is cached as an 'answer').
    ["audio", "video"].forEach(function (type) {
            if (!session || !session.media || !Array.isArray(session.media))
                return;

            var idx = null;
            if (Object.keys(recvonlySsrcs[type]).length > 0) {
                idx = self.getFirstSendingIndexFromAnswer(type);
                if (idx === null) {
                    // If this is the first offer we receive, we don't have a
                    // cached answer. Assume that we will be sending media using
                    // the first m-line for each media type.

                    for (var i = 0; i < session.media.length; i++) {
                        if (session.media[i].type === type) {
                            idx = i;
                            break;
                        }
                    }
                }
            }

            if (idx && session.media.length > idx) {
                var mLine = session.media[idx];
                Object.keys(recvonlySsrcs[type]).forEach(function (ssrc) {
                        if (mLine.sources && mLine.sources[ssrc]) {
                            console.warn("Replacing an existing SSRC.");
                        }
                        if (!mLine.sources) {
                            mLine.sources = {};
                        }

                        mLine.sources[ssrc] = recvonlySsrcs[type][ssrc];
                    }
                );
            }
        }
    );

    // We regenerate the BUNDLE group (since we regenerated the mids)
    session.groups.some(function (group) {
            if (group.type === 'BUNDLE') {
                group.mids = mids.join(' ');
                return true;
            }
        }
    );

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    // Cache the transformed SDP (Unified Plan) for later re-use in this
    // function.
    this.cache[desc.type] = resStr;

    return new RTCSessionDescription({
            type: desc.type,
            sdp: resStr
        }
    );

    //#endregion
};

},{"./array-equals":6,"./transform":11}],9:[function(require,module,exports){
/**
 * Copyright(c) Starleaf Ltd. 2016.
 */


"use strict";

var transform = require('../transform');

module.exports = function (desc, cache) {
    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    // Objectify the SDP for easier manipulation.
    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' || !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Unified Plan SDP. Plan B
    // SDP has a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function (m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Unified Plan.');
        return desc;
    }

    //#endregion

    // HACK https://bugzilla.mozilla.org/show_bug.cgi?id=1113443
    var rewrite = false;
    for (var i = 0; i < session.media.length; i++) {
        var uLine = session.media[i];
        uLine.rtp.forEach(function (rtp) {
            if (rtp.codec === 'NULL') {
                rewrite = true;
                var offer = transform.parse(cache.local);
                rtp.codec = offer.media[i].rtp[0].codec;
            }
        });
    }

    if (rewrite) {
        desc.sdp = transform.write(session);
    }

    // Unified Plan SDP is our "precious". Cache it for later use in the Plan B
    // -> Unified Plan transformation.

    //#region Convert from Unified Plan to Plan B.

    // We rebuild the session.media array.
    var media = session.media;
    session.media = [];

    // Associative array that maps channel types to channel objects for fast
    // access to channel objects by their type, e.g. type2bl['audio']->channel
    // obj.
    var type2bl = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    // Implode the Unified Plan m-lines/tracks into Plan B channels.
    media.forEach(function (uLine, index) {

        // If we don't have a channel for this uLine.type, then use this
        // uLine as the channel basis.
        if (typeof type2bl[uLine.type] === 'undefined') {
            type2bl[uLine.type] = uLine;
        }

        if (uLine.port === 0) {
            if (index > 1 && uLine.type !== 'data') { //it's a secondary video stream - drop without further ado
                return;
            }
            else {
                delete uLine.mid;
                uLine.mid = uLine.type;
                //types.push(uLine.type);
                session.media.push(uLine);
                return;
            }
        }

        if (uLine.type === 'application') {
            session.media.push(uLine);
            types.push(uLine.mid);
            return;
        }
        // Add sources to the channel and handle a=msid.
        if (typeof uLine.sources === 'object') {
            Object.keys(uLine.sources).forEach(function (ssrc) {
                if (typeof type2bl[uLine.type].sources !== 'object')
                    type2bl[uLine.type].sources = {};

                // Assign the sources to the channel.
                type2bl[uLine.type].sources[ssrc] =
                    uLine.sources[ssrc];

                if (typeof uLine.msid !== 'undefined') {
                    // In Plan B the msid is an SSRC attribute. Also, we don't
                    // care about the obsolete label and mslabel attributes.
                    //
                    // Note that it is not guaranteed that the uLine will
                    // have an msid. recvonly channels in particular don't have
                    // one.
                    type2bl[uLine.type].sources[ssrc].msid =
                        uLine.msid;
                }
                // NOTE ssrcs in ssrc groups will share msids, as
                // draft-uberti-rtcweb-plan-00 mandates.
            });
        }

        // Add ssrc groups to the channel.
        if (typeof uLine.ssrcGroups !== 'undefined' &&
            Array.isArray(uLine.ssrcGroups)) {

            // Create the ssrcGroups array, if it's not defined.
            if (typeof type2bl[uLine.type].ssrcGroups === 'undefined' || !Array.isArray(
                    type2bl[uLine.type].ssrcGroups)) {
                type2bl[uLine.type].ssrcGroups = [];
            }

            type2bl[uLine.type].ssrcGroups =
                type2bl[uLine.type].ssrcGroups.concat(
                    uLine.ssrcGroups);
        }

        if (type2bl[uLine.type] === uLine) {
            // Copy ICE related stuff from the principal media line.
            uLine.candidates = media[0].candidates;
            uLine.iceUfrag = media[0].iceUfrag;
            uLine.icePwd = media[0].icePwd;
            uLine.fingerprint = media[0].fingerprint;

            // Plan B mids are in ['audio', 'video', 'data']
            uLine.mid = uLine.type;

            // Plan B doesn't support/need the bundle-only attribute.
            delete uLine.bundleOnly;

            // In Plan B the msid is an SSRC attribute.
            delete uLine.msid;

            // Used to build the group:BUNDLE value after this loop.
            types.push(uLine.type);

            // Add the channel to the new media array.
            session.media.push(uLine);
        }
    });

    // We regenerate the BUNDLE group with the new mids.
    session.groups.some(function (group) {
        if (group.type === 'BUNDLE') {
            group.mids = types.join(' ');
            return true;
        }
    });

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    return new window.RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });
};
},{"../transform":11}],10:[function(require,module,exports){
/**
 * Copyright(c) Starleaf Ltd. 2016.
 */


"use strict";


var transform = require('../transform');
var arrayEquals = require('../array-equals');

var copyObj = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};

module.exports = function (desc, cache) {

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' || !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Plan B SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length > 3 || !session.media.every(function (m) {
                return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
            }
        )) {
        console.warn('This description does not look like Plan B.');
        return desc;
    }

    // Make sure this Plan B SDP can be converted to a Unified Plan SDP.
    var bmids = [];
    session.media.forEach(function (m) {
            if(m.port !== 0) { //ignore disabled streams, these can be removed from the bundle
                bmids.push(m.mid);
            }
        }
    );

    var hasBundle = false;
    if (typeof session.groups !== 'undefined' &&
        Array.isArray(session.groups)) {
        hasBundle = session.groups.every(function (g) {
                return g.type !== 'BUNDLE' ||
                    arrayEquals.apply(g.mids.sort(), [bmids.sort()]);
            }
        );
    }

    if (!hasBundle) {
        throw new Error("Cannot convert to Unified Plan because m-lines that" +
            " are not bundled were found."
        );
    }

    var localRef = null;
    if (typeof cache.local !== 'undefined')
        localRef = transform.parse(cache.local);

    var remoteRef = null;
    if (typeof cache.remote !== 'undefined')
        remoteRef = transform.parse(cache.remote);


    var mLines = [];

    session.media.forEach(function (bLine, index, lines) {

        var uLine;
        var ssrc;

        /*if ((typeof bLine.rtcpMux !== 'string' ||
            bLine.rtcpMux !== 'rtcp-mux') &&
            bLine.direction !== 'inactive') {
            throw new Error("Cannot convert to Unified Plan because m-lines " +
                "without the rtcp-mux attribute were found.");
        }*/
        if(bLine.port === 0) {
            // change the mid to the last used mid for this media type, for consistency
            if(localRef !== null && localRef.media.length > index) {
                bLine.mid = localRef.media[index].mid;
            }
            mLines.push(bLine);
            return;
        }

        // if we're offering to recv-only on chrome, we won't have any ssrcs at all
        if (!bLine.sources) {
            uLine = copyObj(bLine);
            uLine.sources = {};
            uLine.mid = uLine.type + "-" + 1;
            mLines.push(uLine);
            return;
        }

        var sources = bLine.sources || null;

        if (!sources) {
            throw new Error("can't convert to unified plan - each m-line must have an ssrc");
        }

        var ssrcGroups = bLine.ssrcGroups || [];
        bLine.rtcp.port = bLine.port;

        var sourcesKeys = Object.keys(sources);
        if (sourcesKeys.length === 0) {
            return;
        }
        else if (sourcesKeys.length == 1) {
            ssrc = sourcesKeys[0];
            uLine = copyObj(bLine);
            uLine.mid = uLine.type + "-" + ssrc;
            mLines.push(uLine);
        }
        else {
            //we might need to split this line
            delete bLine.sources;
            delete bLine.ssrcGroups;

            ssrcGroups.forEach(function (ssrcGroup) {
                //update in use ssrcs so we don't accidentally override it
                var primary = ssrcGroup.ssrcs[0];
                //use the first ssrc as the main ssrc for this m-line;
                var copyLine = copyObj(bLine);
                copyLine.sources = {};
                copyLine.sources[primary] = sources[primary];
                copyLine.mid = copyLine.type + "-" + primary;
                mLines.push(copyLine);
            });
        }
    });

    if (desc.type === 'offer') {
        if (localRef) {
            // you can never remove media streams from SDP.
            while (mLines.length < localRef.media.length) {
                var copyline = localRef.media[mLines.length];
                copyline.port = 0;
                mLines.push(copyline);
            }
        }
    }
    else {
        //if we're answering, if the browser accepted the transformed plan b we passed it,
        //then we're implicitly accepting every stream.
        //Check all the offers mlines - if we're missing one, we need to add it to our unified plan in recvOnly.
        //in this case the far end will need to dynamically determine our real SSRC for the RTCP stream,
        //as chrome won't tell us!

        if (remoteRef === undefined) {
            throw Error("remote cache required to generate answer?");
        }
        remoteRef.media.forEach(function(remoteline, index) {
            if(index < mLines.length) {
                // the line is already present in the plan-b, so will be handled correctly by the browser;
                return;
            }
            if(remoteline.mid === undefined) {
                console.warn("remote sdp has undefined mid attribute");
                return;
            }
            if(remoteline.port === 0) {
                var disabledline = {};
                disabledline.port = 0;
                disabledline.type = remoteline.type;
                disabledline.protocol = remoteline.protocol;
                disabledline.payloads = remoteline.payloads;
                disabledline.mid = remoteline.mid;
                if(!session.connection) {
                    if(mLines[0].connection) {
                        disabledline.connection = copyObj(mLines[0].connection);
                    } else {
                        throw Error("missing connection attribute from sdp");
                    }
                } else {
                    disabledline.connection = copyObj(session.connection);
                }
                disabledline.connection.ip = "0.0.0.0";

                mLines.push(disabledline);
                console.log("added disabled m line to the media");
            }
            else {
                for(var i = 0; i < mLines.length; i ++) {
                    var typeref = mLines[i];
                    //check if we have any lines of the same type in the current answer to
                    // build this new line from.
                    if(typeref.type === remoteline.type) {
                        var linecopy = copyObj(typeref);
                        linecopy.mid = remoteline.mid;
                        linecopy.direction = "recvonly";
                        mLines.push(linecopy);
                        break;
                    }
                }
            }
        });
    }

    session.media = mLines;

    var mids = [];
    session.media.forEach(function (mLine) {
            mids.push(mLine.mid);
        }
    );

    session.groups.some(function (group) {
            if (group.type === 'BUNDLE') {
                group.mids = mids.join(' ');
                return true;
            }
        }
    );


    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);
    return new window.RTCSessionDescription({
            type: desc.type,
            sdp: resStr
        }
    );
};
},{"../array-equals":6,"../transform":11}],11:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var transform = require('sdp-transform');

exports.write = function(session, opts) {

  if (typeof session !== 'undefined' &&
      typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // expand sources to ssrcs
      if (typeof mLine.sources !== 'undefined' &&
        Object.keys(mLine.sources).length !== 0) {
          mLine.ssrcs = [];
          Object.keys(mLine.sources).forEach(function (ssrc) {
            var source = mLine.sources[ssrc];
            Object.keys(source).forEach(function (attribute) {
              mLine.ssrcs.push({
                id: ssrc,
                attribute: attribute,
                value: source[attribute]
              });
            });
          });
          delete mLine.sources;
        }

      // join ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                Array.isArray(ssrcGroup.ssrcs)) {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.join(' ');
            }
          });
        }
    });
  }

  // join group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids !== 'undefined' && Array.isArray(g.mids)) {
        g.mids = g.mids.join(' ');
      }
    });
  }

  return transform.write(session, opts);
};

exports.parse = function(sdp) {
  var session = transform.parse(sdp);

  if (typeof session !== 'undefined' && typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // group sources attributes by ssrc
      if (typeof mLine.ssrcs !== 'undefined' && Array.isArray(mLine.ssrcs)) {
        mLine.sources = {};
        mLine.ssrcs.forEach(function (ssrc) {
          if (!mLine.sources[ssrc.id])
          mLine.sources[ssrc.id] = {};
        mLine.sources[ssrc.id][ssrc.attribute] = ssrc.value;
        });

        delete mLine.ssrcs;
      }

      // split ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs === 'string') {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.split(' ');
            }
          });
        }
    });
  }
  // split group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids === 'string') {
        g.mids = g.mids.split(' ');
      }
    });
  }

  return session;
};


},{"sdp-transform":2}]},{},[5])(5)
});