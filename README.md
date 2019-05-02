# Cyber Mega Phone 2K

Cyber Mega Phone 2K Ultimate Dynamic Edition is a simple browser side client
application that was created for testing of [Asterisk's](https://github.com/asterisk)
(15+) multistream capabilities. Firefox and Chrome based browsers are supported.

### Dependencies

Currently, Cyber Mega Phone 2K utilizes [JsSIP](http://www.jssip.net/) (v3.0.13) for
SIP support and [sdp-interop-sl](https://github.com/StarLeafRob/sdp-interop-sl) (v1.4.0)
for SDP Plan B support that is currently needed for Chrome based browsers. Both of these
libraries can be found under the 'lib' directory within the project so there should be
no need for further download.

As mentioned multistream support is only supported in Asterisk 15+. Also, the pjsip
channel driver is currently the **only** channel driver that is multistream enabled.

### Usage

Build and [install](https://wiki.asterisk.org/wiki/display/AST/Installing+Asterisk) Asterisk.
Once installed configure Asterisk to listen for webrtc connections. See the
[WebRTC tutorial](https://wiki.asterisk.org/wiki/display/AST/WebRTC+tutorial+using+SIPML5)
on the Asterisk wiki. The configuration should be similar.

You'll need to add a few additional settings to your configured pjsip endpoint.
`max_audio_streams` and `max_video_streams` need to be set to a number greater than one
(the default) in order for Asterisk to allow more than one of each stream type. 
```
max_audio_streams=<num>
max_video_streams=<num>
webrtc=yes
```

You will also need to configure an extension to dial. You should be able to dial out to another
endpoint, but the easiest way to check out the multistream capabilities is to dial into a
[confbridge](https://wiki.asterisk.org/wiki/display/AST/ConfBridge)
or use app_stream_echo. For instance, to use the Asterisk stream echo dialplan application create
an extension with the following (be sure to set 'max_video_streams' to at least 4 then):
```
exten => stream_echo,1,Answer()
  same => n,StreamEcho(4)
  same => n,Hangup()
```
Calling the above should result in your browser showing five video streams. One local and four
remote streams. If you have configured an extension for a confbridge then, when dialed, you may
initially see a single video stream (if you are the first to join) and then other video elements
are added and removed as others join or leave the confbridge.

Once Asterisk is configured and running open either a Firefox or Chrome based browser.
In all likelyhood you'll need to register your cert first, so enter the following address:

https://[ip of asterisk server]:8089/ws

And manually confirm the security exception. Go to File->Open, navigate to where you downloaded
Cyber Mega Phone 2K, and then open the 'index.html' file. In your browser you should see some
fancy side scrolling text and three buttons. Click the 'Account' button and enter the endpoint
credentials you configured in Asterisk (Note, 'ID' is the endpoint name). Also enter the extension
you would like to dial. Close the box and then press the 'Connect' button. This should connect you
to Asterisk and register the endpoint if configured to do that. Now the 'Call' button should be
enabled. Press it to dial the set extension. Depending on the extension you dialed, and if you
allowed your browser access, you should now see one or more video elements displayed. 'Hangup' or
'Disconnect' to end.

### Recommendations

If you experience audio issues, it may be a good idea to turn on the jitterbuffer. This can cause
the audio to be slightly delayed, but will also eliminate problems such as bursty audio packets
causing disruptions. You can enable this option in confbridge.conf for a user, or you can do it
through the dialplan before placing the user in the conference by using the JITTERBUFFER dialplan
function for a more fine tuned experience.

### License

Cyber Mega Phone 2K is released under the [MIT License](LICENSE) Copyright (C) 2017 Digium, Inc.
