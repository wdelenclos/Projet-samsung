/* search jQuery, Modernizr, smg */
(function(window, document, $) {
  "use strict";

  $.fn.typeAhead2 = function(options) {
    var opts = $.extend({}, $.fn.typeAhead2.defaults, options);
    var currentUrl = window.location.href;
    var arr = currentUrl.split("/");
    var urlPrep = arr[0] + "//" + arr[2];
    var $input = $('#headerSearch, #fluidSearch, #mobileSearch'),
      typeAhead,
      typeAheadFl = opts.typeAheadFl,
      b2bFl = opts.b2b ? "BusinessTypeAhead" : "GlobalTypeAhead",
      b2bFam = opts.b2b ? "B2BFamilyID" : "FamilyID",
      b2bUrlFl = opts.b2b ? "/business" : "",
      autoB2B = opts.b2b ? "Y" : "N",
      bmUrl = urlPrep + "/us/search/searchMain?format=json&Dy=1&Nty=1&Ntt=",
      searchUrl = typeAheadFl ? urlPrep + '/us/search/' + b2bFl.toLowerCase() + '?Nty=1&Ntk=' + b2bFl + '&Nu=' + b2bFam + '&Np=1&Ntx=mode%2bmatchallpartial&Ntt=' : urlPrep + '/us/search/autoComplete.us?b2b=' + autoB2B + '&pageType=&keyword=',
      taUrl = urlPrep + '/us/search/' + b2bFl.toLowerCase() + '?Nty=1&Ntk=' + b2bFl + '&Nu=' + b2bFam + '&Np=1&Ntx=mode%2bmatchallpartial&Ntt=*',
      autoUrl = urlPrep + '/us/search/autoComplete.us?b2b=' + autoB2B + '&pageType=&keyword=',
      $desktopSearch = $('#desktop_search_form'),
      $recentHistory = $('.searchHist'),
      $clearHist = $('.clear-button'),
      hasfocus = false,
      taContainers = '<div class="typeahead"><div class="searchProducts"></div><div class="searchSuggestions"></div></div>';

    var $dSearch = $('.gnb-b2c-search-results-container');
    $dSearch.append(taContainers);
    var $searchIcon = $(".gnb-b2c-icons-search");

    var $taWrap = $('.typeahead');
    var $querySearch = $('.searchSuggestions');
    var $searchProducts = $('.searchProducts');

    var setHist = function() {
	if(!isMobile()){
	    $('.gnb-b2c-searchoverlay').append('<div class="searchHist"></div>');
	}else{
	    $('.gnb-b2c-searchoverlay').append('<div class="searchHist"></div>');
	}
        var chk = opts.b2b ? $.cookie('searchHistB2B') : $.cookie('searchHist');
        if (chk != null) {
          var c = chk.split(',');
          var hist =
            '<div id="searchHist" class="searchHist">' +
              '<div class="historyTitle">Search History <div class="clear-button" data-link_id="search_predictive_clear" data-link_meta="link_name:clear history" data-link_position="search flyout" data-link_cat="clear history">CLEAR HISTORY</div></div>';
          var banner = "";
          for (var i = 0; i < c.length; i++) {
            var k = fortune(c[i]);
            hist +='<span class="ta-history" data-search_category="predictive>history" data-search_term="' + k + '" data-search_location="internal search" data-search_type="predictive>history">' + k + '</span>';
          }
          var clearBtn =
          '<div class="clear-button">' +
            '<p class="button alt" data-link_id="search_predictive_clear" data-link_meta="link_name:clear history" data-link_position="search flyout" data-link_cat="clear history">' +
              'Clear History' +
            '</p>' +
          '</div>';

          hist += '</div>';

          $('.ta-history').click(function() {
            $input.val($(this).text());
            $('#desktop_search_form').submit(); // submit search from history click
          });

          var loadHist = setInterval(function() {
              $(".searchHist").replaceWith(hist);
              $recentHistory = $('#desktop_search_form .searchHist');

              $($desktopSearch).find($recentHistory).css('width', $desktopSearch.width());
              $('.ta-history').click(function() {
                 $input.val($(this).text());
                 $('#desktop_search_form').submit();
               });
              clearInterval(loadHist);
           }, 500);
          displayTypeAhead();
        }
         else {
           $(".searchHist").remove();
         }
      },
      addHist = function(key) {
        var chk = opts.b2b ? $.cookie('searchHistB2B') : $.cookie('searchHist');
        if (key != null && key != "") {
          if (chk != null) {
            var cs = chk.split(',');
            var match = false;
            for (var i = 0; i < cs.length; i++) {
              if (cs[i].toString() === key) match = true;
            }
            if (match == false) {
              var c = [key];
              if (cs.length > 3) {
                cs.splice(3, 4);
                c.push.apply(c, cs);
              } else {
                c.push.apply(c, cs);
              }
              $.cookie(opts.b2b ? 'searchHistB2B' : 'searchHist', c.join(), {
                expires: 12,
                path: '/'
              });
            }
          } else {
            $.cookie(opts.b2b ? 'searchHistB2B' : 'searchHist', key, {
              expires: 12,
              path: '/'
            });
          }
        }
      },
      fortune = function(str) {
        return String(str)
          .replace(/<script>/g, '')
          .replace(/<\/script>/g, '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      },
      buildSuggested = function(data, key) {
        //var item='<div class="suggestionTitle">Search Suggestions</div>',
        var item = '',
          mobileCt = 0,
          shopKey = "",
          shopLink = "",
          b2bfl = opts.b2b ? "/business" : "",
          categories = [];
        if (Object.keys(data).indexOf('ShopIn') != -1) {
          var shopin = data.ShopIn;
          for (var shp in shopin) {
            if (shp == "ShopKeyword") shopKey = shopin[shp];
            if (shp == "LinkUrl") shopLink = shopin[shp];
          }
          item += '<div class="shop-in" data-id="ta-' + clearSnip(Object.keys(shopin).toString()).replace(/[\W_]+/g, "-") + '"><a href="' + shopLink + '" data-search_category="predictive>general" data-search_term="' + shopKey + '" data-search_location="internal search" data-search_type="predictive>general">' + capFirst(shopKey) + '</a></div>';
          mobileCt++;
        }
        if (Object.keys(data).indexOf('Categories') != -1) {
          var shop = data.Categories.Category;
          for (var i = 0; i < shop.length; i++) {
            for (var shp in shop[i]) {
              categories.push(Object.keys(shop[i]).toString());
            }
          }
        }
        if (Object.keys(data).indexOf('SearchIn') != -1) {
          var searchIn = data.SearchIn;
          for (var srch in searchIn) {
            for (var i = 0; i < categories.length; i++) {
              var last="";
              if(i==categories.length-1){last=" last"};
              item += '<div class="search-in'+last+'"><a href="/us/search' + b2bfl + searchIn[srch] + '" data-search_category="predictive>general" data-search_term="' + categories[i] + '" data-search_location="internal search" data-search_type="predictive>general">' + bold(categories[i], key) + ' in <span class="blue">' + srch + '</span></a></div>';
              mobileCt++;
            }
          }
          item+='<div class="spacer"></div>';
        }
        if (Object.keys(data).indexOf('Suggestions') != -1) {
          var sg = data.Suggestions.Suggestion;
          if (sg != null) {
            for (var i = 0; i < sg.length; i++) {
              if (isMobile() && mobileCt == 10) break;
              var title = clearSnip(sg[i]);
              item += '<div class="suggestion" data-search_category="predictive>general" data-search_term="' + clearSnip(sg[i]) + '" data-search_location="internal search" data-search_type="predictive>general" data-id="ta-' + clearSnip(title).replace(/[\W_]+/g, "-") + '">' + bold(clearSnip(sg[i]), key) + '</div>';
              mobileCt++;
            }
          }
        }
        if (mobileCt == 0) {
          item += '<p class="ta-none" data-id="">No Suggestions</p>';
        }
        return item;
      },
      buildRecommended = function(data, key) {
        var item = '';
        if (Object.keys(data).indexOf('Recommend') < 0) {
          typeAheadFl = false;
        } else {
          typeAheadFl = true;
        }
        if (typeAheadFl) {
          var rec = data.Recommend;
          if (rec != "false") {
            for (var r in rec) {
              for (var p in rec[r]) {
                if (Object.keys(rec[r][p]).length > 0) {
                  var product = rec[r];
                  item += '<div id="ta-' + r.replace(/[\W_]+/g, "-") + '" class="searchProduct">' +
                    '<div class="recommendedTitle">Recommended Results for <span><strong>&quot;' + r + '&quot;</strong></span></div>';
                  for (var a in product[p]) {
                    var attr = product[p][a][0];
                    var linkUrl = opts.b2b ? attr['B2B.LinkUrl'] : attr['LinkUrl'];
                    if (linkUrl == undefined) {
                      linkUrl = attr['B2B.LinkUrl'];
                    }
                    var stars = (Math.round(attr.Ratings_display * 2) / 2).toFixed(1);
                    var starsClass = "stars_" + stars.toString().replace(".", "_");
                    var itmImg=attr.MediumImage;
			if(typeof itmImg!="undefined"){
			    itmImg=itmImg.toString().split('|')[0];
			}else{
			    itmImg="";
			}
                    item += '<div class="recItem"><table><tr><td><a href="' + linkUrl + '" data-search_category="predictive>' + attr.ModelCode + '>product image" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product image"><img src="' + itmImg + '"/></a></td>' +
                      '<td><div class="ta-recommended"><a href="' + linkUrl + '" data-search_category="predictive>' + attr.ModelCode + '>product text" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product text">' + a + '</a></div>';
                    if (attr.ReviewsCount > 0) {
                      item += '<div class="rating"><span class="stars ' + starsClass + '">' + stars + '</span><a href="' + linkUrl + '-reviews" data-search_category="predictive>' + attr.ModelCode + '>product review" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product review">(' + attr.ReviewsCount + ')</a></div>';
                    } else {
                      item += '<div class="rating"><a href="' + linkUrl + '-reviews" data-search_category="predictive>' + attr.ModelCode + '>product review" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product review">Be the first to write a review</a></div>';
                    }
                    item += '<div class="supportLinks"><a href="/us' + b2bUrlFl + '/support/owners/product/' + attr.ModelCode + '#manuals" data-search_category="predictive>' + attr.ModelCode + '>product manual" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product manual">Owners Manual<svg><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/us/resources/navigation/assets/images/sprite.symbol.svg#angle-right"></use></svg></a><a href="/us' + b2bUrlFl + '/support/owners/product/' + attr.ModelCode + '" data-search_category="predictive>' + attr.ModelCode + '>product support" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product support">Support<svg><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/us/resources/navigation/assets/images/sprite.symbol.svg#angle-right"></use></svg></a><a class="registerDevice" href="/us/support/account/' + attr.ModelCode + '" data-search_category="predictive>' + attr.ModelCode + '>product register" data-search_term="' + r + '" data-search_location="internal search" data-search_type="predictive>' + attr.ModelCode + '>product register">Register<svg><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/us/resources/navigation/assets/images/sprite.symbol.svg#angle-right"></use></svg></a></div></td></tr></table></div>';
                  }
                  item += '</div>';
                }
              }
            }
          } else {
            typeAheadFl = false;
          }
        }
        if (!typeAheadFl) {
          if (data.length > 0) {
            item = '<div id="ta-' + key.replace(/[\W_]+/g, "-") + '" class="searchProduct"><div id="ta-recommended" class="recommendedTitle searchProduct">Recommended Results for <span><strong>&quot;' + key + '&quot;</strong></span></div>';
            for (var i = 0; i < data.length; i++) {
              if (data[i].type == "recommand") {
                var stars = (Math.round(data[i].ratingsDisplay * 2) / 2).toFixed(1);
                var starsClass = "stars_" + stars.toString().replace(".", "_");
                item += '<div class="recItem">' +
                  '<table border=0><tr><td><a href="' + data[i].linkUrl + '"><img src="' + data[i].imgUrl + '"/></a></td>' +
                  '<td><div class="ta-recommended"><a href="' + data[i].linkUrl + '">' + data[i].title + '</a></div>';
                if (data[i].reviewsCount > 0) {
                  item += '<div class="rating"><span class="stars ' + starsClass + '">' + stars + '</span><a href="' + data[i].linkUrl + '#reviews">(' + data[i].reviewsCount + ')</a></div>';
                } else {
                  item += '<div class="rating"><a href="' + data[i].linkUrl + '#reviews">Be the first to write a review</a></div>';
                }
                item += '<div class="supportLinks"><a href="/us/support/owners/product/' + data[i].prdMdlCd + '#manuals"><img src="/us/support/images/icon-owners-manual.png">Owners Manual</a><a href="/us/support/owners/product/' + data[i].prdMdlCd + '"><img src="/us/support/images/icon-support.png">Support</a><a class="registerDevice" href="/us/support/account/' + data[i].prdMdlCd + '"><img src="/us/images/support/iconCollapsed.png">Register</a></div></td></tr></table></div>';
              }
            }
            item += "</div>";
          }
        }
        return item;
      },
      capFirst = function(str) {
        return str.replace(/\w\S*/g, function(txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1);
        });
      },
      bold = function(t, key) {
        if (t.toLowerCase().indexOf(key.toLowerCase()) > -1) {
          var s = "<strong>",
            e = "</strong>";
          var start = t.toLowerCase().indexOf(key.toLowerCase());
          t = t.splice(start, 0, s);
          var end = t.toLowerCase().indexOf(key.toLowerCase()) + key.length;
          t = t.splice(end, 0, e);
        }
        return t;
      },
      boldSnip = function(t) {
        return t.replace(/<endeca_term>/g, "<strong>").replace(/<\/endeca_term>/g, "</strong>");
      },
      clearSnip = function(t) {
        return t.replace(/<endeca_term>/g, "").replace(/<\/endeca_term>/g, "");
      },
      isMobile = function() {
        if ($("meta[device]").attr("device") == "mobile" || window.innerWidth < 769)
          return true;
        return false;
      },
      isTablet = function() {
        if ($("meta[device]").attr("device") == "tablet" || window.innerWidth < 786)
          return true;
        return false;
      },
      addListeners = function(key) {
        $taWrap.show();
        $($desktopSearch).find($querySearch).css('width', $desktopSearch.width());
        $querySearch = $('.searchSuggestions');
        $(".gnb-b2c-searchoverlay").addClass("gnb-b2c-searchoverlay-with-results");
        $($querySearch, $desktopSearch).one('mouseover', function() {
          $desktopSearch.find($querySearch).css('width', $desktopSearch.width());
        });
        $(".searchSuggestions>.suggestion:not(.shop-in,.search-in), .autoSuggest").on("mouseover", function(e) {
          e.preventDefault();
          $searchProducts.children().hide();
          if (!isMobile() && $searchProducts.html()!="") {
            $(this).parents().find("#headerSearch").val($(this).text());
            $(this).parent().parent().find(".searchProducts").show().css('display', 'inline-block');
            $(this).parent().parent().find(".searchProducts #" + $(this).attr("data-id")).show();
          }else{
            $searchProducts.hide();
          }
        }).on("mouseout", function() {
          if($searchProducts.html()!=""){
              $(this).parents().find("#headerSearch").val(key);
              $($searchProducts, ">div:first-child").show();
          }
        });
        if (!isMobile()) {
          $(".searchProduct").hide();
          $dSearch.show();
          $(".searchProducts, .searchSuggestions").show().css('display', 'inline-block');
          if($searchProducts.html()==""){
              $searchProducts.hide();
          }else{
              $("#" + $("#desktop_search_form .suggestion:first").data('id'), $desktopSearch).show();
              $("#" + $(".suggestion:first", $dSearch).data('id'), $dSearch).show();
              $(".shop-in, .search-in").on("mouseover", function() {
                $(".searchProduct").hide();
                $searchProducts.show().css('display', 'inline-block');
                $("#" + $("#desktop_search_form .suggestion:first").data('id'), $desktopSearch).show();
                $("#" + $(".suggestion:first", $dSearch).data('id'), $dSearch).show();
              });
          }
        }else{
          $dSearch.show();
          $(".searchSuggestions").show();
        }
        $('.suggestion').click(function(e) {
          $input.val($(this).text());
          $input.closest('form.search-form').submit();
        });
        $(".recItem a").click(function() {
          addHist($(this).parents(".searchProduct").find(".recommendedTitle span").text().replace(/"/g, ""));
        });
      },
      init = function() {
        var schReq = $.ajax();
        $(".gnb-b2c-btn-close").on("click",function(){
            $querySearch.empty();
            $searchProducts.empty();
        });
        $input.on("keyup", function(e) {
          schReq.abort();
          var key = $(this).val().trim();
          if (key.length > 1) {
            if($('.searchHist').css('display')!='none') $('.searchHist').hide();
            schReq = $.ajax({
              url: taUrl + key + "*",
              type: 'GET',
              success: function(d) {
                if ($querySearch.size() == 0) {
                  $querySearch.append(buildSuggested(d, key));
                  if (!isMobile()) $searchProducts.append(buildRecommended(d, key));
                } else {
                  $querySearch.html(buildSuggested(d, key));
                  if (!isMobile()) $searchProducts.html(buildRecommended(d, key));
                }
                addListeners(key);
                if (!typeAheadFl && !isMobile()) {
                  $(".suggestion").one("mouseover", function(e) {
                    var key = $(this).text();
                    var autoItem = $("#ta-" + key.replace(/\s/g, "-"));
                    if (autoItem.size() == 0) {
                      $.ajax({
                        url: autoUrl + key,
                        type: 'GET',
                        success: function(d) {
                          $searchProducts.append(buildRecommended(d, key));
                          addListeners(key);
                        }
                      });
                    }
                  });
                }
              }
            });
          } else {
              $taWrap.children().hide();
              if ($('.searchHist').size() > 0) {
        	  if($('.searchHist').css('display')=='none'){$('.searchHist').slideDown();}
              }else{
                  $('.searchHist').slideUp(300);
              }
          }
        });
        $input.closest('form').on("submit", function() {
          addHist($(this).find($input).val());
        });

        // clear history
        $('body').on('click', '.searchHist .clear-button', function() {
          clearHist();
          setHist();
        });

      };

    function clearHist() {
      $.cookie(opts.b2b ? 'searchHistB2B' : 'searchHist', '', {
        expires: -10000,
        path: '/'
      });
    }

    function displayTypeAhead() {
    $searchIcon.on('mouseover', function(){
        if($input.val()==""){
            $('.searchHist').slideDown(300);
        }else{
            $('.searchHist').slideUp(300);
        }
    });
    $('#headerSearch').keyup(function() {
        if ($(this).val().length >= 1) {
          if (Modernizr.mq('(min-width: 980px)')) {
            $querySearch.show().css('display', 'inline-block');
            $(this).parent().find($querySearch).css('width', $desktopSearch.width());
            if (opts.b2b) {
              if (Modernizr.mq('(max-width: 1024px)')) {
                $(this).parent().find($querySearch).css('width', '100%')
              };
            }
          }
        }
        $('.searchSuggestions .suggestion').on('mouseover', function() {
            if($searchProducts.html()==""){
        	$searchProducts.hide();
            }else{
                $(this).parent().css('display', 'inline-block');
                if (Modernizr.mq('(min-width: 980px)')) {
                    $searchProducts.show();
                }
            }
        });
    }).on("focus", function() {
	hasfocus = true;
    });
    }
    return {
      init: init(),
      setHist: setHist()
    }
  }

  $.fn.typeAhead2.defaults = {
    typeAheadFl: true,
    b2b: false
  }

  $(function() {
    var $searchForm = $("form.search-form");
    var formAction = $("form.search-form:first").attr("action");

    if (typeof formAction != "undefined" && formAction.indexOf("business") < 0 && document.location.href.indexOf('/support') > -1)
      $("form.search-form").attr("action", "/us/search/support/searchMain");
    $searchForm.find(".icons-search-gray").attr("disabled", "disabled");

    var $search = $('#headerSearch');
    if (document.location.href.indexOf("/business") > -1) {
      $search.typeAhead2({
        b2b: true
      });
    } else {
      $search.typeAhead2();
    }
  });
}(window, document, $));

String.prototype.splice = function(idx, rem, s) {
  return (this.slice(0, idx) + s + this.slice(idx + Math.abs(rem)));
};
