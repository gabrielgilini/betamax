var Betamax;
(function()
{
    // Feature testing support from David Mark's My Library
    // <http://www.cinsoft.net/mylib.html>
    var reFeaturedMethod = new RegExp('^(function|object)$', 'i');

    // Test for properties of host objects that are never callable
    // (e.g. document nodes, elements)
    var isRealObjectProperty = function(o, p)
    {
        return !!(typeof o[p] == 'object' && o[p]);
    };

    var isHostMethod = function(o, m)
    {
        var t = typeof o[m];
        return !!((reFeaturedMethod.test(t) && o[m]) || t == 'unknown');
    };

    var isHostObjectProperty = function(o, p)
    {
        var t = typeof o[p];
        return !!(reFeaturedMethod.test(t) && o[p]);
    };

    var addClass = function(el, cn)
    {
        var elCn = el.className;
        if(!(new RegExp('(^|\\s)' + cn + '(\\s|$)')).test(elCn))
        {
            el.className += (elCn ? ' ' : '') + cn
            return true;
        }
        return false;
    };

    var removeClass = function(el, cn)
    {
        el.className = el.className.replace(
                            new RegExp('(^|\\s)' + cn + '(\\s|$)'), ''
                        );
    }

    var attachListener = function(el, evt, fn)
    {
        if(isHostMethod(el, 'addEventListener'))
        {
            el.addEventListener(evt, fn, false);
        }
        else if(isHostMethod(el, 'attachEvent'))
        {
            el.attachEvent('on' + evt, fn);
        }
        else
        {
            el['on' + evt] = fn;
        }
    };

    var emptyNode = function(el)
    {
        while(el.firstChild)
        {
            el.removeChild(el.firstChild);
        }
    };

    var handleError = function (e)
    {
        var error = e.target.error;
        switch (error.code)
        {
            case error.MEDIA_ERR_ABORTED:
                throw new Error('You aborted the video playback.');
                break;
            case error.MEDIA_ERR_NETWORK:
                throw new Error('A network error caused the video download to fail part-way.');
                break;
            case error.MEDIA_ERR_DECODE:
                throw new Error('The video playback was aborted due to a corruption problem or because the video used features your browser did not support.');
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                throw new Error('The video could not be loaded, either because the server or network failed or because the format is not supported.');
                break;
            default:
                throw new Error('An unknown error occurred.');
                break;
        }
    };

    var normalizeTime = function(secs)
    {
        var m = Math.floor(secs / 60),
            s = Math.floor(secs % 60);
        
        if(m < 10)
        {
            m = '0' + m;
        }
        
        if(s < 10)
        {
            s = '0' + s;
        }
        
        return m + ':' + s;
    };
    
    Betamax = function(videoEl)
    {
        if(typeof videoEl == 'string')
        {
            videoEl = document.getElementById(videoEl);
        }

        if(videoEl.nodeName.toLowerCase() != 'video')
        {
            throw new Error('Betamax must be passed a video element to the constructor');
            return;
        }

        var that = this;

        this.video = videoEl;
        this.controls = {};

        attachListener(videoEl, 'error', handleError);

        videoEl.controls = false;

        var videoWrapper = document.createElement('div');
        videoWrapper.className = 'betamax-wrapper';
        videoEl.parentNode.appendChild(videoWrapper);
        videoWrapper.appendChild(videoEl);

        var playPause = document.createElement('button');
        playPause.className = 'betamax-playpause';
        playPause.appendChild(document.createTextNode('Play'));
        videoWrapper.appendChild(playPause);
        this.controls.playPause = playPause;
        attachListener(
            playPause,
            'click',
            function(e)
            {
                e.preventDefault();
                if(videoEl.paused)
                {
                    that.play();
                }
                else
                {
                    that.pause();
                }
            }
        );

        attachListener(
            videoEl,
            'play',
            function()
            {
                addClass(videoWrapper, 'playing');
                emptyNode(playPause);
                playPause.appendChild(document.createTextNode('Pause'));
            }
        );

        attachListener(
            videoEl,
            'pause',
            function()
            {
                removeClass(videoWrapper, 'playing');
                emptyNode(playPause);
                playPause.appendChild(document.createTextNode('Play'));
            }
        );

        var seekBar = document.createElement('div');
        seekBar.className = 'betamax-seekbar';
        videoWrapper.appendChild(seekBar);

        var progressBar = document.createElement('div');
        progressBar.className = 'betamax-progressbar';
        seekBar.appendChild(progressBar);

        var progressTime = document.createElement('p');
        progressTime.className = 'betamax-progresstime';
        var vidDuration;
        if(videoEl.readyState < videoEl.HAVE_METADATA)
        {
            progressTime.appendChild(
                document.createTextNode('--:-- / --:--')
            );
            attachListener(
                videoEl,
                'loadedmetadata',
                function()
                {
                    vidDuration = this.duration;
                    updateTime();
                }
            );
        }
        else
        {
            vidDuration = videoEl.duration;
            updateTime();
        }

        var updateTime = function()
        {
            emptyNode(progressTime);
            progressTime.appendChild(
                document.createTextNode(
                    normalizeTime(videoEl.currentTime) +
                    '/' +
                    normalizeTime(vidDuration)
                )
            );
            
            progressBar.style.width = ((videoEl.currentTime / vidDuration) * 100) + '%';
        };

        videoWrapper.appendChild(progressTime);

        attachListener(
            videoEl,
            'timeupdate',
            updateTime
        );
        
        attachListener(
            videoEl,
            'click',
            function()
            {
                if(this.paused)
                {
                    this.play();
                }
                else
                {
                    this.pause();
                }
            }
        )
    };

    var bProto = Betamax.prototype;

    bProto.play = function()
    {
        if(this.video.paused)
        {
            this.video.play();
        }
    };

    bProto.pause = function()
    {
        if(!this.video.paused)
        {
            this.video.pause();
        }
    }

})();
