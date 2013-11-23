require(['jquery', 'socket.io', 'base/find', 'base/autoset', 'base/utils',
    'base/geo', 'settings', 'nunjucks', 'templates', 'moment', 'lib/d3.min'],
    function ($, io, find, Autoset, utils, geo, settings, nunjucks, templates, moment, d3) {
        'use strict';

        /*********************************************************/
        /* Polyfills */
        /*********************************************************/

        //String.contains polyfill for chrome / safari
        if (!('contains' in String.prototype)) {
            String.prototype.contains = function (str, startIndex) {
                return ''.indexOf.call(this, str, startIndex) !== -1;
            };
        }

        //toSimpleISOString polyfill
        if (!Date.prototype.toSimpleISOString) {

            ( function () {

                function pad(number) {
                    var r = String(number);
                    if (r.length === 1) {
                        r = '0' + r;
                    }
                    return r;
                }

                Date.prototype.toSimpleISOString = function () {
                    return this.getUTCFullYear()
                        + '-' + pad(this.getUTCMonth() + 1)
                        + '-' + pad(this.getUTCDate())
                        + 'T' + pad(this.getUTCHours())
                        + ':' + pad(this.getUTCMinutes())
                        + ':' + pad(this.getUTCSeconds())
                        + 'Z';
                };

            }());
        }

        /*********************************************************/
        /* End Polyfills */
        /*********************************************************/

//        var wrapper = $('#wrapper');
        var find = $('#fifi-find');

        var inResults = false;
        var socketUrl = settings.SOCKET_URL;
        var socket = io.connect(socketUrl);
        var lastTerm;

        var autoset = new Autoset();

        nunjucks.configure('/templates', { autoescape: true });

        function toggleVizIcon() {
            if (searchCategory === "news") {
                $("#viz-icon").show();
            } else {
                $("#viz-icon").hide();
            }
        }

        /* search category buttons */
        var searchCategory = "news";

        //toggleVizIcon();

        $(document).ready(function () {
            $(".search-category-button").click(function (event) {
                searchCategory = $(event.currentTarget).data().category;
            });
        });

        // Listen for data from server and convert to module events
        socket.on('api/suggestDone', function (data) {
            console.log('GOT api/suggestDone: ', data);
            socket.emit('api/suggestDone/' + data.engineId, data);

            var results = data.result;
            var value = find.val().toString();

            if (!!results) {
                if (data.secondary) {
                    if (value === data.originalTerm) {
                        autoset.generateSecondary(value, results, data.engineId, searchCategory, function () {
                            nunjucks.render('results_secondary.html', {
                                engineSet: autoset.engines[searchCategory],
                                found: utils.keySize(autoset.engines[searchCategory]),
                                term: data.term
                            }, function (err, res) {
                                if (err) console.error(err);
                                else $('.suggestions-secondary').html(res);
                            });
                        });
                    }
                } else {
                    if (value === data.term) {
                        autoset.generate(value, results, data.engineId, searchCategory, function () {
                            nunjucks.render('results.html', {
                                engineSet: autoset.engines[searchCategory],
                                found: utils.keySize(autoset.engines[searchCategory])
                            }, function (err, res) {
                                if (err) {
                                    console.error(err);
                                }
                                else $('.suggestions').html(res);
                            });
                        });
                    }
                }
            }
        });

        socket.on('api/suggestImageDone', function (data) {
            console.log('GOT api/suggestImageDone: ', data.term);

            if (data.result.items && data.result.items[0].pagemap.cse_image) {
                $('.suggestions li[data-term="' + data.term + '"]')
                    .css('background-image',
                        'url(' + data.result.items[0].pagemap.cse_image[0].src + ')');
            }
        });

        socket.on('api/queryDone', function (data) {
            console.log('GOT api/queryDone: ', data);

            nunjucks.render('result.html', {
                engineId: data.engineId
            }, function (err, res) {
                if (err) {
                    console.error(err);
                    return;
                }

                // ignore the wikipedia entry for now
                if (data.engineId !== 'en.wikipedia.org') {
                    $('#details-list').append(res);
                }

                var defList = $('#definition-links');
                var defVideos = $('#definition-videos');

                switch (data.engineId) {
                    case 'boxfish.com':
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');

                        //parse out the channels that boxfish is returning related to these keywords
                        if (data.result) {
                            if (data.result.channels) {
                                data.result.channels.forEach(function (item, index, list) {
                                    $("#grid-wrapper #columns").append(
                                        $('<div class="card"/>').append(
                                            $('<a class="result-title"/>').html(item.name),
                                            $('<p class="result-snippet"/>').html(item.number)
                                        )
                                    )
                                });
                            }

                            if (data.result.mentions) {
                                data.result.mentions.forEach(function (item, index, list) {
                                    $("#grid-wrapper #columns").append(
                                        $('<div class="card"/>').append(
                                            "<p>Mentioned on ...</p>",
                                            $('<a class="result-title"/>').html(item.program.name),
                                            $('<p class="result-snippet"/>').html(item.text)
                                        )
                                    )
                                });
                            }

                            if (data.result.programs) {
                                data.result.programs.forEach(function (item, index, list) {
                                    $("#grid-wrapper #columns").append(
                                        $('<div class="card"/>').append(
                                            $('<a class="result-title"/>').html(item.name),
                                            $('<p class="result-snippet"/>').html(item.description)
                                        )
                                    )
                                });
                            }
                        }
                        break;
                    case 'bing.com':
                        var json = $.parseJSON(data.result);
                        var list = json.d.results;

                        //var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');

                        if (list) {
                            list.forEach(function (item, index, list) {
//                                content.append(
//                                    $('<div class="result-item result-item-fixed-height"/>').append(
//                                        $('<a class="result-title"/>').html(item.Title).attr('href', item.Url),
////                                        $('<a class="result-url"/>').text(item.DisplayUrl),
//                                        $('<p class="result-snippet"/>').html(item.Description)
//                                    )
//                                )

//                                    var newElement = $('<div class="result-item result-item-fixed-height"/>').append(
//                                        $('<a class="result-title"/>').html(item.Title).attr('href', item.Url),
//                                        $('<p class="result-snippet"/>').html(item.Description)
//                                    )

                                $("#grid-wrapper #columns").append(
                                    $('<div class="card"/>').append(
                                        $('<a class="result-title"/>').html(item.Title).attr('href', item.Url),
                                        $('<p class="result-snippet"/>').html(item.Description)
                                    )
                                );

                                //append to isotope
//                                window.isoAppend(
//                                    $('<div class="result-item result-item-fixed-height column"/>').append(
//                                        $('<a class="result-title"/>').html(item.Title).attr('href', item.Url),
//                                        $('<p class="result-snippet"/>').html(item.Description)
//                                    )
//                                );

                            });

//                            if(!window.hasColumnsLayout) {
//                                window.hasColumnsLayout = true;
//                                $(".fifi-results").columnize();
//                            } else {
//                                console.log("already laid out the columns")
//                            }

                            /* will re-enable later for other search categories that use bing */
//                            var itemURL = "";
//                            for (var index = 0, item; item = list[index]; index += 1) {
//                                itemURL = item.Url;
//                                if (itemURL.contains('en.wikipedia.org')) {
//                                    defList.append(
//                                        $('<li class="wikipedia icon"/>').append(
//                                            $('<a/>').text(item.Title.replace(' - Wikipedia, the free encyclopedia', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                } else if (itemURL.contains('twitter.com')) {
//                                    defList.append(
//                                        $('<li class="twitter icon"/>').append(
//                                            $('<a/>').text(item.Url.replace(/http(s)?:\/\/twitter\.com\//, '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // locate a vimeo user account
//                                } else if (itemURL.contains('vimeo.com')) {
//                                    defList.append(
//                                        $('<li class="vimeo icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('on Vimeo', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // Locate a facebook page for result
//                                } else if (itemURL.contains('www.facebook.com')) {
//                                    defList.append(
//                                        $('<li class="facebook icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('| Facebook', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // find a YouTube user account
//                                } else if (itemURL.contains('www.youtube.com/user/')) {
//                                    defList.append(
//                                        $('<li class="youtube icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('- YouTube', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // this will just find youtube videos that might be useful
//                                } else if (itemURL.contains('www.youtube.com')) {
//                                    defVideos.append(
//                                        $('<li/>').append(
//                                            $('<a/>').attr('href', item.Url).append(
//                                                $('<img/>').css({ 'width': 140, 'height': 100 }).attr("src", "http://placehold.it/140x100")
//                                            )
//                                        )
//                                    );
//                                } else if (itemURL.contains('www.amazon.com')) {
//                                    // we don't want amazon results showing up as they
//                                    // will be duplicates of what Amazon gives us
//                                    // defList.append(
//                                    //   $('<li/>').append(
//                                    //     $('<a/>').text(item.title).attr('href', item.link)
//                                    //     )
//                                    //   );
//                                } else if (itemURL.contains('www.yelp.com')) {
//                                    // we don't want yelp results showing up as they
//                                    // will be duplicates of what Amazon gives us
//                                    // defList.append(
//                                    //   $('<li/>').append(
//                                    //     $('<a/>').text(item.title).attr('href', item.link)
//                                    //     )
//                                    //   );
//                                } else {
//                                    rest.push(item);
//                                }
//                            }



                        } else {
                            content.parent().remove();
                        }

                        break;

                    case 'amazon.com':
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');
                        var product = data.result && data.result.length;
                        var first, $first;

                        if (product) {
                            first = data.result.shift();
                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + ((first.mediumimage) ? first.mediumimage[0].url[0] : '') + ')' }).appendTo(content);
                            $first.append(
                                $('<div class="result-header-info"/>').append(
                                    $('<p class="result-header-title"/>').text(first.itemattributes[0].title[0]),
                                    $('<p class="result-header-price"/>').text((first.itemattributes[0].listprice && first.itemattributes[0].listprice[0].formattedprice) ? first.itemattributes[0].listprice[0].formattedprice[0] : ''),
                                    $('<p class="result-header-snippet"/>').html((first.itemattributes[0].feature) ? first.itemattributes[0].feature[0] : '')
                                )
                            );
                            data.result.slice(0, Math.min(3, data.result.length)).forEach(function (item) {
                                var attrs = item.itemattributes[0];
                                if (item.detailpageurl && attrs) {
                                    content.append(
                                        $('<div class="result-item result-item-fixed-height"/>').data({ url: item.detailpageurl[0] }).append(
                                            $('<div class="result-image-wrapper"/>').append(
                                                $('<img class="result-image"/>').attr('src', ((item.mediumimage) ? item.mediumimage[0].url[0] : ''))
                                            ),
                                            $('<div class="result-info"/>').append(
                                                $('<p class="result-title"/>').text(attrs.title[0]),
                                                $('<p class="result-price"/>').text((attrs.listprice && attrs.listprice[0].formattedprice) ? attrs.listprice[0].formattedprice[0] : '')
                                            )
                                        )
                                    );
                                }
                            });
                        } else {
                            content.parent().remove();
                        }
                        break;

                    case 'yelp.com':
                        var businesses = data.result && data.result.businesses;
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');
                        var first, $first, $reviews;

                        if (businesses) {
                            first = businesses.shift();
                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + (first.image_url || '').replace(/ms.jpg$/, "l.jpg") + ')' }).appendTo(content);
                            $reviews = $('<div class="result-header-reviews"/>');
                            for (var i = 0; i < 5; i += 1) {
                                if (i < Math.floor(first.rating)) {
                                    $reviews.append($('<i class="icon-star"></i>'));
                                } else if (i < first.rating) {
                                    $reviews.append(
                                        $('<div class="icon-star-half-colored"/>').append(
                                            $('<i class="icon-star-half"></i>'),
                                            $('<i class="icon-star-half-empty"></i>')
                                        )
                                    );
                                } else {
                                    $reviews.append($('<i class="icon-star-empty"></i>'));
                                }
                            }
                            // need a bit of space between stars and # of reviews
                            $reviews.append(" ");
                            $first.append(
                                $('<span class="search-brand-icon"/>').append("Yelp ", $('<img class="search-brand-image image-yelp" src="images/yelp.com-16x16.png"/>')),
                                $('<div class="result-header-info"/>').append(
                                    $('<p class="result-header-title"/>').text(first.name),
                                    $('<p class="result-header-address"/>').text(first.location.address.shift()),
                                    $('<p class="result-header-phone"/>').text(first.display_phone),
                                    $reviews.append($('<span/>').text(first.review_count + " reviews"))
                                )
                            );
                            businesses.slice(0, Math.min(3, businesses.length)).forEach(function (item) {
                                var $reviews = $('<div class="result-reviews"/>');
                                for (var i = 0; i < 5; i += 1) {
                                    if (i < Math.floor(item.rating)) {
                                        $reviews.append($('<i class="icon-star"></i>'));
                                    } else if (i < first.rating) {
                                        $reviews.append(
                                            $('<div class="icon-star-half-colored"/>').append(
                                                $('<i class="icon-star-half"></i>'),
                                                $('<i class="icon-star-half-empty"></i>')
                                            )
                                        );
                                    } else {
                                        $reviews.append($('<i class="icon-star-empty"></i>'));
                                    }
                                }
                                content.append(
                                    $('<div class="result-item result-item-fixed-height cf"/>').append(
                                        $('<div class="result-image-wrapper"/>').append(
                                            $('<img class="result-image"/>').attr('src', (item.image_url || ''))
                                        ),
                                        $('<div class="result-info"/>').append(
                                            $('<p class="result-title"/>').text(item.name),
                                            $reviews,
                                            $('<span class="result-reviews"/>').text(item.review_count + " reviews")
                                        )
                                    )
                                );
                            });
                        } else {
                            content.parent().remove();
                        }
                        break;

                    case 'foursquare.com':
                        var groups = data.result && data.result.groups;
                        var businesses;
                        if (groups) {
                            groups.every(function (group) {
                                if (group.name === "recommended") {
                                    businesses = group.items;
                                    return false;
                                }
                                return true;
                            });
                        }
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');
                        var first, $first, $reviews;

                        if (businesses) {
                            first = businesses.shift();
                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + (first.venue.photos.groups[0].items[0].prefix + "320x320" + first.venue.photos.groups[0].items[0].suffix || '') + ')' }).appendTo(content);
                            $reviews = $('<div class="result-header-reviews"/>');
                            $reviews = $('<div class="result-header-reviews"/>');
                            $reviews.append($("<span class='venue-rating'/>").text((first.venue.rating || 0).toPrecision(2)).
                                toggleClass("venue-rating-positive", first.venue.rating && first.venue.rating > 7).
                                toggleClass("venue-rating-neutral", first.venue.rating && first.venue.rating <= 7));
                            // need a bit of space between stars and # of reviews
                            $reviews.append(" ");
                            $first.append(
                                $('<span class="search-brand-icon"/>').append("FourSquare ", $('<img class="search-brand-image image-foursquare" src="images/foursquare-16x16.png"/>')),
                                $('<div class="result-header-info"/>').append(
                                    $('<p class="result-header-title"/>').text(first.venue.name),
                                    $('<p class="result-header-address"/>').text(first.venue.location.address),
                                    $('<p class="result-header-phone"/>').text(first.venue.contact.formattedPhone),
                                    $reviews.append($('<span/>').text(first.venue.likes.count + " likes"))
                                )
                            );
                            businesses.slice(0, Math.min(3, businesses.length)).forEach(function (item) {
                                var $reviews = $('<div class="result-reviews"/>');
                                var src = '';
                                if (item.venue.photos && item.venue.photos.groups[0] && item.venue.photos.groups[0].items[0]) {
                                    src = (item.venue.photos.groups[0].items[0].prefix + "100x100" + item.venue.photos.groups[0].items[0].suffix);
                                }
                                $reviews = $('<div class="result-header-reviews"/>').
                                    append($("<span class='venue-rating'/>").text((item.venue.rating || 0).toPrecision(2)).
                                        toggleClass("venue-rating-positive", item.venue.rating && item.venue.rating > 7).
                                        toggleClass("venue-rating-neutral", item.venue.rating && item.venue.rating <= 7));
                                content.append(
                                    $('<div class="result-item result-item-fixed-height cf"/>').append(
                                        $('<div class="result-image-wrapper"/>').append(
                                            $('<img class="result-image"/>').attr('src', src)
                                        ),
                                        $('<div class="result-info"/>').append(
                                            $('<p class="result-title"/>').text(item.venue.name),
                                            $reviews,
                                            $('<span class="result-reviews"/>').text(item.venue.likes.count + " likes")
                                        )
                                    )
                                );
                            });
                        } else {
                            content.parent().remove();
                        }
                        break;

                    case 'en.wikipedia.org':
                        var article = data.result;

                        if (article) {
                            $('#definition-text').html(article);
                        }
                        break;

                    case 'wikipedia.infobox':
                        var article = data.result;

                        if(article){
                            if($(article)[0] && $(article)[0].data == "null"){
                                console.log("ERROR: no wiki card")
                            } else {
                                $("#grid-wrapper #columns").prepend(
                                    $('<div class="wikipedia-info-card"/>').append( article )
                                );
                            }
                        }
                        break;

                    case 'twitter.com':
                        var tweets = data.result;
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');

                        if (tweets) {
                            // https://twitter.com/logo#twitter-content
                            tweets.statuses.slice(0, Math.min(3, tweets.statuses.length)).forEach(function (item) {
                                $("#grid-wrapper #columns").append(
                                    $('<div class="card"/>').append(
                                        $('<div class="result-tweet"/>').append(
                                            $('<div class="result-tweet-user-info"/>').append(
                                                $('<span class="result-tweet-user-name"/>').text(item.user.name + " "),
                                                $('<span class="result-tweet-user-screen-name"/>').text(item.user.screen_name)
                                            ),
                                            $('<p class="result-tweet-text"/>').html(item.text),
                                            $('<div class="result-tweet-meta"/>').append(
                                                $('<p class="result-tweet-time-ago"/>').text(moment(item.created_at).fromNow()),
                                                $('<i class="icon-twitter"></i>')
                                            )
                                        )
                                    )
                                );

                                //isotope
//                                window.isoAppend(
//                                    $('<div class="result-item column"/>').append(
//                                        $('<div class="result-tweet"/>').append(
//                                            $('<div class="result-tweet-user-info"/>').append(
//                                                $('<span class="result-tweet-user-name"/>').text(item.user.name + " "),
//                                                $('<span class="result-tweet-user-screen-name"/>').text(item.user.screen_name)
//                                            ),
//                                            $('<p class="result-tweet-text"/>').html(item.text),
//                                            $('<div class="result-tweet-meta"/>').append(
//                                                $('<p class="result-tweet-time-ago"/>').text(moment(item.created_at).fromNow()),
//                                                $('<i class="icon-twitter"></i>')
//                                            )
//                                        )
//                                    )
//                                );
                            });
                        } else {
                            content.parent().remove();
                        }
                        break;

                    default:
                        break;
                }
                ;
            });
        });

        // Load initial search template
        nunjucks.render('suggest.html', function (err, res) {
            $('#suggestions').html(res);
        });

        find.get(0).addEventListener('input', function (ev) {
            var value = find.val().toString();

            // if this is a change in terms or empty string
            if (lastTerm !== value || value.length < 1) {
                autoset.engineClear();
                $('.suggestions, .suggestions-secondary').empty();
            }

            lastTerm = value;

            if (value.length >= 1) {
                socket.emit('api/find', {
                    term: value,
                    search: searchCategory,
//                    location: geo.getLastLocation(),
//                    geolocation: geo.getLastPosition().coords.latitude + ',' + geo.getLastPosition().coords.longitude
                    location: '',
                    geolocation: ''

                });
            }
        });

        find.on('keydown', function (ev) {
            if (ev.which === 13) {
                goSearch(find.val().toString());
            }
        });

        $('#fifi-find').one('focus', function () {
            $('#fifi-find').addClass('fifi-find-box-focused')
                .find('#fifi-find-box')
                .addClass('fifi-find-box-focused');
            geo.startWatchingPosition($('#geolocation-name'));
        });

        function goBack() {
            $('#grid-wrapper').hide();
            $('#grid-wrapper #columns').empty();
            $('#suggestions').show();
            // reset original search terms
            $('#fifi-find').val(lastTerm);
            inResults = false;
        }

        $('#fifi-find').on('focus', function () {
            if (inResults) {
                goBack();
            }
        });

        // on N+1 runs, if we've already successfully gotten their location
        // lets just go ahead and grab it again.  there's no real API to know
        // that our site has been granted the location permission

//        if (geo.haveGeolocationPermission()) {
//            geo.startWatchingPosition($('#geolocation-name'));
//        }


        function goSearch(term) {
            $('#suggestions').hide();

            $("#grid-wrapper").show();

            // save the current terms
            lastTerm = $('#fifi-find').val();
            // set suggested terms as current
            $('#fifi-find').val(term);

            for (var engine in autoset.engines[searchCategory]) {
                socket.emit('api/query', {
                    term: term,
//                    location: geo.getLastLocation(),
//                    geolocation: geo.getLastPosition().coords.latitude + ',' + geo.getLastPosition().coords.longitude,
                    location: '',
                    geolocation: '',
                    engineId: engine,
                    search: searchCategory
                });
            }

            inResults = true;
//            nunjucks.render('details.html', { 'term': term }, function (err, res) {
//                inResults = true;
//                $('#details').html(res).show();
//            });
        }

        $("#suggestions").on('touchstart click', function (ev) {
            var self = $(ev.target);

            switch (self.data('action')) {
                case 'concept':
                    goSearch(self.data('term'))
                    break;

                case 'back':
                    goBack();
                    break;

//                case 'geolocation':
//                    if (!geo.isWatchingPosition()) {
//                        geo.startWatchingPosition($('#geolocation-name'));
//                    } else {
//                        geo.stopWatchingPosition();
//                    }
//                    break;


            }
        });


        /*********************************************/
        /* Anthony scroll up code */
        /*********************************************/
        $(document).ready(function () {

            $("#fifi-find").on("focus", function () {
                var scrollTo = $(this).offset().top - 30;
                scrollPage(scrollTo, "up");
            });

            // $("#fifi-find").on("blur",function(){
            //     var scrollTo = 0;
            //     scrollPage(scrollTo, "down");
            // });

            function scrollPage(scrollTo, direction) {
                var bounceOffset;

                if (direction == "up") {
                    bounceOffset = 20;
                } else {
                    bounceOffset = 0;
                }

                $("body", "html").animate({
                    scrollTop: scrollTo,
                    easing: "linear"
                }, 200, function () {

                    // $("body","html").animate({
                    //   scrollTop : scrollTo,
                    //   easing : "linear"
                    // }, 150)

                });
            }
        });


        function showNewsViz() {
            console.log("called")
//        $("#wrapper").hide();
//        $("#boxfishNewsViz").show();
            document.getElementById("wrapper").style.visibility = "hidden";
            document.getElementById("boxfishNewsViz").style.visibility = "visible";
        }


        /**********************************************/
        /* Boxfish code */
        /**********************************************/

//        var trendingData = {};
//
//        var diameter = 800,
//            format = d3.format(",d"),
//            color = d3.scale.category20c();
//
//        var bubble = d3.layout.pack()
//            .sort(null)
//            .size([diameter, diameter])
//            .padding(1.5);
//
//        function loadData(date) {
//
//            $("#container").html('');
//
//            var svg = d3
//                .select("#container")
//                .append("svg")
//                .attr("width", diameter)
//                .attr("height", diameter)
//                .attr("class", "bubble");
//
//            var node = svg.selectAll(".node")
//                .data(bubble.nodes(parseData(trendingData, date)).filter(function (d) {
//                    return !d.children;
//                }))
//                .enter().append("g")
//                .attr("class", "node")
//                .attr("transform", function (d) {
//                    return "translate(" + d.x + "," + d.y + ")";
//                });
//
//            node.append("title")
//                .text(function (d) {
//                    return d.className + ": " + format(d.value);
//                });
//
//            node.append("circle")
//                .attr("r", function (d) {
//                    return d.r;
//                })
//                .style("fill", function (d) {
//                    return color(d.packageName);
//                });
//
//            node.append("text")
//                .attr("dy", ".3em")
//                .style("text-anchor", "middle")
//                .text(function (d) {
//                    return d.className.substring(0, d.r / 3);
//                });
//
//            d3.select(self.frameElement).style("height", diameter + "px");
//        }
//
//        // Returns a flattened hierarchy containing all leaf nodes under the root.
//        function parseData(data, date) {
//            var classes = [];
//            $('#dates').html('');
//            var dataForDate = data[0];
//
//            if (typeof date == 'undefined') {
//                $('#date_0').append("<strong>&nbsp;&lt;--</strong>");
//            }
//
//            for (var keywordIndex in data) {
//                var trendName = data[keywordIndex].name;
//                var trendData = data[keywordIndex].metrics;
//
//                for (var trendDateIndex in trendData) {
//                    if (((typeof date == 'undefined' || date == null) && trendDateIndex == 0)
//                        || date == trendData[trendDateIndex].time) {
//                        classes.push({packageName: trendName, className: trendName, value: trendData[trendDateIndex].count});
//
//                        if ($('#chkRelated').attr('checked') == 'checked') {
//                            for (var relatedIndex in trendData[trendDateIndex].related) {
//                                var related = trendData[trendDateIndex].related[relatedIndex];
//                                classes.push({packageName: trendName, className: related.name, value: related.count});
//                            }
//                        }
//                    }
//                }
//            }
//
//            if (data.length > 0) {
//                for (var dateIndex in data[0].metrics) {
//                    // also append dates
//                    $('#dates').append("<br /><a style='text-decoration:underline; font-size: 22px; line-height: 36px;' id=\"date_" + dateIndex + "\" onclick=\"loadData('" + data[0].metrics[dateIndex].time + "');\">" + new Date(data[0].metrics[dateIndex].time).toLocaleDateString("en-US") + "</a>");
//
//                    if (typeof date != 'undefined' && data[0].metrics[dateIndex].time == date) {
//                        $('#date_' + dateIndex).append("<strong>&nbsp;&lt;&lt;</strong>");
//                    }
//                }
//            }
//
//            if (typeof date == 'undefined') {
//                $('#date_0').append("<strong>&nbsp;&lt;&lt;</strong>");
//            }
//
//            return {children: classes};
//        }
//        ;
//
//        var now = new Date();
//        $("#txtEnd").val(now.toSimpleISOString());
//        $("#txtStart").val(new Date(now - 604800000).toSimpleISOString());
//
//
//        $('#cmdGraph').click(function () {
//
//            // 2013-08-21T23:00:00Z
//
//            var startDate = new Date($("#txtStart").val());
//            var endDate = new Date($("#txtEnd").val());
//            var granularity = $("#selectGranularity").children(":selected").val();
//            var apiKey = $("#api-key").val();
//
//            $.ajax({
//                url: "https://api-staging.boxfish.com/v4/trending/metrics/",
//                data: { start: startDate.toSimpleISOString(), stop: endDate.toSimpleISOString(), granularity: granularity, token: apiKey },
//                traditional: true,
//                success: function (data) {
//                    trendingData = data;
//
//                    // the first time load the data:
//                    loadData();
//                }
//            });
//        });

    });
/* end function require pass params */


