///////////////////////////////////////////////////////////////////////////////
//  Cyber Mega Phone 2K
//  Copyright (C) 2017 Digium, Inc.
//
//  This program is free software, distributed under the terms of the
//  MIT License. See the LICENSE file at the top of the source tree.
///////////////////////////////////////////////////////////////////////////////

function FullScreen(obj) {
	this._obj = obj;
}

FullScreen.prototype.can = function () {
	return !!(document.fullscreenEnabled || document.mozFullScreenEnabled ||
			document.msFullscreenEnabled || document.webkitSupportsFullscreen ||
			document.webkitFullscreenEnabled);
};

FullScreen.prototype.is = function() {
	return !!(document.fullScreen || document.webkitIsFullScreen ||
			document.mozFullScreen || document.msFullscreenElement ||
			document.fullscreenElement);
};

FullScreen.prototype.setData = function(state) {
	this._obj.setAttribute('data-fullscreen', !!state);
};

FullScreen.prototype.exit = function() {
	if (!this.is()) {
		return;
	}

	if (document.exitFullscreen) {
		document.exitFullscreen();
	} else if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	} else if (document.webkitCancelFullScreen) {
		document.webkitCancelFullScreen();
	} else if (document.msExitFullscreen) {
		document.msExitFullscreen();
	}

	this.setData(false);
};

