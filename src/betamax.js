var Betamax;
(function()
{
    var global = this, cbUid = 0;

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

    // xhr partially taken from My Library
    var createXmlHttpRequest = (function()
    {
        var i, fs;

        fs = [// for legacy eg. IE 5
            function()
            {
                return new global.ActiveXObject("Microsoft.XMLHTTP");
            },
            // for fully patched Win2k SP4 and up
            function()
            {
                return new global.ActiveXObject("Msxml2.XMLHTTP.3.0");
            },
            // IE 6 users that have updated their msxml dll files.
            function()
            {
                return new global.ActiveXObject("Msxml2.XMLHTTP.6.0");
            },
            // IE7, Safari, Mozilla, Opera, etc (NOTE: IE7+ native version does
            // not support overrideMimeType or local file requests)
            function()
            {
                return new global.XMLHttpRequest();
            }
        ];


        // Loop through the possible factories to try and find one that
        // can instantiate an XMLHttpRequest object that works.
        for (i=fs.length; i--; )
        {
            try
            {
                if (fs[i]())
                {
                    return fs[i];
                }
            }
            catch(e){}
        }
    })();


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
    };

    var shuffleArray = function(arr)
    {
        for(var i = arr.length, j, temp; --i;)
        {
            j = Math.floor(Math.random() * (i + 1));
            temp = arr[j];
            arr[j] = arr[i];
            arr[i] = temp;
        }

        return arr;
    }

    var uid = 0;
    var getUid = function(el)
    {
        if(el.id)
        {
            return el.id;
        }

        return (el.id = ('betamax-' + (++uid) + '-uid'));
    };

    var parseJson = (function()
    {
        if(
            isRealObjectProperty(global, 'JSON')
            && typeof global.JSON.parse == 'function'
        )
        {
            return function(json){ return global.JSON.parse(json); };
        }
        else
        {
            return function(json)
            {
                return (new Function('return (' + json + ');'))();
            };
        }
    })();

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
                throw new Error(
                    'A network error caused the video download to fail '
                    + 'part-way.'
                );
                break;
            case error.MEDIA_ERR_DECODE:
                throw new Error(
                    'The video playback was aborted due to a corruption '
                    + 'problem or because the video used features your browser '
                    + 'did not support.'
                );
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                throw new Error(
                    'The video could not be loaded, either because the server '
                    + 'or network failed or because the format is not '
                    + 'supported.'
                );
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

    var getOffsetLeft = function(el)
    {
        var offset = 0;
        while(el && typeof el.offsetLeft == 'number')
        {
            offset += el.offsetLeft;
            el = el.parentNode;
        }

        return offset;
    };

    Betamax = function(videoEl, options)
    {
        if(typeof videoEl == 'string')
        {
            videoEl = document.getElementById(videoEl);
        }

        if(videoEl.nodeName.toLowerCase() != 'video')
        {
            throw new Error(
                'Error: Betamax must be passed a video element to the '
                + 'constructor'
            );
            return;
        }

        if(!options)
        {
            options = {};
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

        attachListener(
            seekBar,
            'click',
            function(e)
            {
                var p = (e.pageX - getOffsetLeft(this)) / this.clientWidth;
                videoEl.currentTime = vidDuration * p;
                progressBar.width = p * 100 + '%';
            }
        );

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

            progressBar.style.width = (
                (videoEl.currentTime / vidDuration) * 100
            ) + '%';
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
        );

        // Buscape ads
        if(options.buscape)
        {
            (function()
            {
                var buscape = options.buscape;
                if(!buscape.id)
                {
                    throw new Error(
                        'Error: options.buscape detected, but '
                        + 'options.buscape.id is missing'
                    );
                }

                var adsList = document.createElement('ul');
                adsList.className = 'betamax-buscape';

                var apiCb = function(data)
                {
                    if(
                        data.product
                        && data.details.status == 'success'
                    )
                    {
                        appendProductsInRandomOrder(
                            data.product
                        );
                        videoWrapper.appendChild(adsList);
                    }
                };

                var cbName = '__betamax_buscape_cb' + (++cbUid);
                global[cbName] = apiCb;

                var scriptEl = document.createElement('script');
                scriptEl.src = 'http://sandbox.buscape.com/service/topProducts/'
                            + buscape.id + '/?format=json&results=10&sort=rate'
                            + '&callBack=' + cbName;
                scriptEl.type = 'text/javascript';
                document.body.appendChild(scriptEl);

                var products, prodItems;

                var appendProductsInRandomOrder = function(_products)
                {
                    products = shuffleArray(_products);

                    var productItem, productLink, productThumb, productText,
                        product, prodItems = [];
                    for(var i = 0, l = products.length; i < l; ++i)
                    {
                        product = products[i].product;

                        productItem = document.createElement('li');
                        productItem.style.position = 'absolute';
                        console.log(i);
                        if(i > 0)
                        {
                            productItem.style.top = '-9999px';
                        }
                        prodItems.push(productItem);

                        productLink = document.createElement('a');
                        if(product.thumbnail)
                        {
                            productThumb = document.createElement('img');
                            productThumb.width = 20;
                            productThumb.height = 20;
                            productThumb.src = product.thumbnail.url;
                            productLink.appendChild(productThumb);
                        }
                        productText = document.createElement('span');
                        productText.appendChild(
                            document.createTextNode(
                                product.productshortname
                                + ' \u2014 R$' + product.pricemin
                            )
                        );
                        productLink.appendChild(productText);
                        productLink.target = '_blank';

                        for(
                            var links = product.links, j = 0, k = links.length;
                            j < k;
                            ++j
                        )
                        {
                            if(links[j].link.type == 'product')
                            {
                                break;
                            }
                        }
                        productLink.href = links[j].link.url
                        productItem.appendChild(productLink);
                        adsList.appendChild(productItem);
                    }

                    var currentProduct = 0;
                    var productsLength = products.length;
                    var listHeight;
                    var duration = buscape.animationDuration || 500;
                    var animateList = function()
                    {
                        var p = 0;
                        var next = currentProduct + 1;
                        if(next == productsLength)
                        {
                            next = 0;
                        }

                        if(!listHeight)
                        {
                            listHeight = adsList.clientHeight;
                        }

                        prodItems[next].style.top = listHeight + 'px';

                        var start = new Date();
                        var animationInter = global.setInterval(
                            function()
                            {
                                p = sigmoid4((new Date() - start) / duration);
                                if(p > 1 || global.isNaN(p))
                                {
                                    p = 1

                                    if(++currentProduct == productsLength)
                                    {
                                        currentProduct = 0;
                                    }
                                    global.clearInterval(animationInter);
                                }
                                prodItems[currentProduct].style.top =
                                    '-' + (listHeight * p) + 'px';
                                prodItems[next].style.top =
                                    (listHeight - (listHeight * p)) + 'px';
                            },
                            10
                        );
                    };

                    //animateList();
                    var inter = global.setInterval(
                        animateList,
                        buscape.animationInterval || 10000
                    );
                };

                var circle = function(p)
                {
                    return Math.sqrt(1 - Math.pow((p - 1), 2));
                };
                var atan = Math.atan;
                var sigmoid4 = function(p)
                {
                    return (atan(4*(2*p-1))/atan(4)+1)/2;
                };
            })();
        }
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
