/* globals jQuery, Modernizr, enquire, smg */
/*!
 * @file digital-river.js
 * @class SMG Object Namespacing
 * @author Jason Han
 * @Modified by Xi for Mini-Cart enhancement
 * @comment Only Page specific functions will be added here
 * @copyright (c) Samsung SDS America Inc.
 */
var tryCount = 0;
smg.global.digitalRiver = (function(window, document, $, undefined) {
	"use strict";
	var dRCount = 0;
	var defaults = {
		container : ".product-module[data-eppMdlCd]",
		holidayPage: false,
		defaultCallback : true, 
		successCallback : function(priceList) {
			
		},done :function(){	
		}
	}, cookie_options = {
		path    : '/',
		domain  : 'samsung.com'
	}, dr_store_domain = '//shop.us.samsung.com';

	function loadPrice(opts) {
		if(window.location.href.indexOf("http://samsung.com/us/shop/black-friday") > -1 ||
				window.location.href.indexOf("http://samsung.com/us/shop/home-appliance-holiday-offers") > -1){
		}else{
		var options = $.extend({}, defaults, opts);
		var planId = $.cookie("tppid");

		if (typeof (planId) != 'undefined' && planId != null && planId != "") {
			var modelCodes = new Array();
			$(options.container).each(function() {
				modelCodes[modelCodes.length] = $(this).attr("data-eppMdlCd");
			});

			var requestData = {
				referralUrl : document.referrer,
				planId : planId,
				modelCodes : modelCodes.toString(),
				holidayPage : options.holidayPage
			};
			$.ajax({
				url : 'http://samsung.com/us/shop/price.us',
				data : requestData,
				type : 'POST',
				dataType : "json",
				error : function() {
					//console.log("error loading http://samsung.com/us/shop/price.us.");
					if(options.done && typeof options.done === "function"){
						options.done();
					}
				},
				success : function(priceList) {
					if(options.defaultCallback) {
						for ( var i = 0; i < priceList.length; i++) {
							$(".product-module[data-eppMdlCd = '"
											+ priceList[i].prdMdlCd
											+ "'] .price-module").html(
									_.template($("#priceTemplate").html(), {
										price : priceList[i]
									}));
						}
					}
					
					if(options.successCallback && typeof options.successCallback === "function"){
						options.successCallback(priceList);
					}
					if(options.done && typeof options.done === "function"){
						options.done();
					}
					
				}
			});
		}else{
			var modelCodes = new Array();
			$(options.container).each(function() {
				if("Y" == $(this).data("ecom") || $(this).data("ecom")){
					modelCodes[modelCodes.length] = $(this).attr("data-eppMdlCd");	
				}
			});
			
			if(modelCodes.length>0){
					getPriceForEcomProducts(modelCodes,options);	
				
			}
			if(options.done && typeof options.done === "function"){
				options.done();
			}
		}
	}
	}
	function isIE() {
	    var ua = window.navigator.userAgent;
	    var msie = ua.indexOf("MSIE ");

	    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
		return true;
	    } else {
		return false;
	    }
	}
	function isEppUser() {
		var planId = $.cookie("tppid");
		if(!!planId) {
			return true;
		} else {
			return false;
		}
	}
	function showEmpty(){
	    if($(".item-container").length>0){
		if($(".item-container").children().length==0){
		$(".item-container").prepend('<p class="gnb-empty-cart">Your shopping cart is empty.</p>');
		}
	    }else{
		$('.cart-container').prepend('<div class="item-container"><p class="gnb-empty-cart">Your shopping cart is empty.</p></div>');
	    }
	}
	function getPriceForEcomProducts(modelCodes,options){
		//console.log("getPriceForEcomProducts");
		$.ajax({
			url : 'http://samsung.com/us/price/samsungB2CEcomPrice.json',
			data : modelCodes.toString(),
			type : 'POST',
			dataType : 'json',
			error : function() {
				//console.log("error loading http://samsung.com/us/price/samsungB2CEcomPrice.json");
				if(options.done && typeof options.done === "function"){
					options.done();
				}
			},
			success : function(priceList) {
				//console.log("success");
				if(options.defaultCallback) {
					//console.log("priceList.length "+priceList.length);
					for ( var i = 0; i < priceList.length; i++) {
						if(priceList[i]!=null){
							$(".product-module[data-eppMdlCd = '"
											+ priceList[i].prdMdlCd
											+ "'] .price-module").html(
									_.template($("#priceTemplate").html(), {
										price : priceList[i]
									}));	
						}
						
					}
				}
				
				if(options.successCallback && typeof options.successCallback === "function"){
					options.successCallback(priceList);
				}
				if(options.done && typeof options.done === "function"){
					options.done();
				}
				
			}
		});	
	}
	
	function loadCart() {
		var tryCount = 0;
		if(/Edge\/|Trident\/|MSIE/.test(window.navigator.userAgent)){
			if($.cookie("tppid")!= null){
				sessionStorage.setItem('eppPlanId', $.cookie("tppid"));
			}
			if(sessionStorage.getItem('eppPlanId')!= null){
				$.cookie("tppid", sessionStorage.getItem('eppPlanId'), {path : '/', domain : 'samsung.com'});
			}
			if($.cookie("tmktid")!= null){
				sessionStorage.setItem('eppMarketId', $.cookie("tmktid"));
			}
			if(sessionStorage.getItem('eppMarketId')!= null){
				$.cookie("tmktid", sessionStorage.getItem('eppMarketId'), {path : '/', domain : 'samsung.com'});
			}
		}
		if(ieVersion < 10){
			loadIECartSummary();
		}
		if(isEppUser()) {
			var accessToken = getCookie("dr_a_token"); 
			if(!!accessToken) {
				loadEPPCartSummary();
			} else {
				getEppInfo();
			}
			
			var logoImg = fortune("tlgimg");
			var imgLength = $('li.epp-card').length;
			if(logoImg != null && logoImg.length > 0 && imgLength == 0){
				logoImg = logoImg.replace(/"/g, "");  
				var logoHtml =  '<li class="epp-card"><img src="' + logoImg + '"/></li>';
				$("header .header-container .main").addClass("epp").append(logoHtml);
				$("#nav .extra-menu").addClass("epp").append(logoHtml);
			} else {
				$("#nav .extra-menu").hide();
			}

			var mktName = fortune("tmktname");
			var nameLength = $("div.epp-name").length;
			if(mktName != null && mktName.length > 0 && nameLength==0){
				mktName = mktName.replace(/"/g, ""); 
				$("header .header-top .header-container").prepend("<div class='epp-name'>Hi " + mktName + "</div>");
				$("#nav .extra-menu").append("<li>Hi " + mktName + "</li>");
			} else {
				$("#nav .extra-menu").hide();
			}
		} else {
			if($.cookie('DR_CART_CONTENT')== 0){
				$('#inner-wrap > header > div.big-header.visible-tablet.visible-desktop > div.header-top > div > ul > li.cart.top > a > b').text('0');
				showEmpty();
			}else{
			loadDRCartSummary();			
		}	
		}
	}

	function getEppInfo() {
		var planId = $.cookie("tppid");
		var referralUrl = $.cookie("trefurl"); 
		var marketId  = $.cookie("tmktid");
		var eppReqSeq = $.cookie("eppReqSeq");
		$.ajax({
			url: "http://samsung.com/us/shop/eppInfo.us",
			dataType : "json",
			data : {
				planId : planId,
				referralUrl : referralUrl,
				marketId : marketId,
				eppReqSeq:eppReqSeq
			},
			success: function(data){
				setToken(data[0]);
				loadEPPCartSummary();
			}
		});
	}
	
	function setToken(tokenTO){
		$.cookie("dr_a_token", tokenTO.accessToken, cookie_options);
		$.cookie("dr_r_token", tokenTO.refreshToken,{ expires: 1, path: '/', domain: 'samsung.com'});
	}
	
	function processEppData(data) {
		if(data != '' && data.length > 0){
			var logo_img = data[0].logoImgPath;
			var plan_id = data[0].planId;
			var market_id = data[0].marketId;
			var market_name = data[0].marketName;
			var rule_name = data[0].ruleName;
			if(market_name.length > 0){
				var name = 'Hi, ' +market_name;
				$.cookie("tmktname", market_name, cookie_options);
			}
			$.cookie("tppid", plan_id, cookie_options);
			$.cookie("tmktid", market_id, cookie_options);
			$.cookie("tlgimg", logo_img, cookie_options);
			$.cookie("taccessrtype", rule_name, cookie_options);
			loadEPPCartSummary();
		}else{
			loadDRCartSummary();
		}
	}
	
	function loadEPPCartSummary() {
		var access_token = $.cookie("dr_a_token"); 
		$.ajax({
			type: "GET",
			url:"https://api.digitalriver.com/v1/shoppers/me/carts/active?expand=lineitems.lineitem.product.externalreferenceid%2Clineitems.lineitem.product.id&callback=smg.global.digitalRiver.eppCartCallback&format=json&token="+access_token,
			dataType: "jsonp",
			jsonpCallback: "smg.global.digitalRiver.eppCartCallback",
			jsonp: "callback"
		});
	}
	
	function eppCartCallback(data) {
		if(typeof(data.errors) != 'undefined') {
			//console.log("refreshtoken");
			if(data.errors.error.code == 'invalid_token'){
				$.cookie("dr_a_token", null, {path : '/', domain : 'samsung.com'});
				loadEPPCartSummary();
			}
			var code = data.errors.error[0].code;
			if(code == 'invalid_token'||code == 'invalid token'){
				$.ajax({
					type: "GET",
					url:"http://samsung.com/us/shop/refreshtoken.us",
					dataType: "json",
					data:{
						eppReqSeq:eppReqSeq
					},
					success: function (tdata){
						if(tdata[0].response == 200){
							setToken(tdata[0]);
							loadEPPCartSummary();
						}
					}
				});
			}
		}else{
			showCart(data);
		}
	}
	
	function loadDRCartSummary() {
		
		$.ajax({
			type: "GET",
			url:"https://api.digitalriver.com/v1/shoppers/me/carts/active?expand=lineitems.lineitem.product.externalreferenceid%2Clineitems.lineitem.product.id&callback=smg.global.digitalRiver.dRCartCallback&format=json&token="+$.cookie("DR_SESSION_TOKEN"),
			dataType: "jsonp",
			jsonpCallback: "smg.global.digitalRiver.dRCartCallback",
			jsonp: "callback"
		});
	}
	function dRCartCallback(data) {
		if(typeof(data.errors) != 'undefined') {
			if(data.errors.error.code == 'invalid_token'){
				$.cookie("DR_SESSION_TOKEN", null, {path : '/', domain : 'samsung.com'});
				loadDRCartSummary();
			}
			if(data.errors.error[0].code == 'invalid token'||data.errors.error[0].code == 'invalid_token'){
				dRCount++;
				$.ajax({
	                url : 'https://shop.us.samsung.com/store/samsung/SessionToken?apiKey=5de150dc29228095f9811cdf15ea5938&format=json',
	                type : 'GET',
	                async: false,
	                contentType: "application/json",
	                dataType:"jsonp",
	                error: function(){
	                    //console.log("error to get token");
	                	},
	                success: function (data) {
	                	//console.log(data.access_token);
	                    $.cookie("DR_SESSION_TOKEN", data.access_token, {path : '/', domain : 'samsung.com'});
	                    if(dRCount>3){
	                    	console.log("Please check whether your domain is under samsung.com");                   	
	                    }else{
	                    loadDRCartSummary();
	                    }
	                }
				});
			}
		}else{
			dRCount=0;
			showCart(data);
		}
	}
	
	function showCart(data) {
		$(".cart-basket").text(data.cart.totalItemsInCart);
		if (isIE()) {
		    $('.gnb-b2c-icons-cart a').remove('svg').prepend('<svg viewBox="0 0 100 100" id="cart-open">'
						+ '<circle cx="28" cy="90" r="10"/>'
						+ '<circle cx="86" cy="90" r="10"/>'
						+ '<path d="M86 14v42H28V13.86C28 6.205 21.794 0 14.14 0H0v14h14v42c0 7.732 6.268 14 14 14h58c7.732 0 14-6.268 14-14V14H86z"/>'
						+ '</svg>');
		    } else {
			if (!$('.gnb-b2c-icons-cart a svg use').attr('xlink:href','../img/sprite.symbol.svg#cart-open')) {
			    $('.gnb-b2c-icons-cart a svg use').attr('xlink:href','../img/sprite.symbol.svg#cart-open');
			}
		    }
		$(".item-container").each(function(){
		    if($(this).children().size()<=0){
			$(this).remove();
		    }
		});
		if (data.cart.totalItemsInCart > 0) {
		var items = data.cart.lineItems.lineItem;
		var itemsCount = items.length;
	        var $CART_CONTAINER = $(".cart-container");
	        var outputHtml = '<div class="item-container">';
	        var itemsEndHtml = '</div>';
	        var productString = '';
	        var showItems = itemsCount;
	        if (itemsCount > 4) {
	            showItems = 4;
	        }
	        for (var i = 0; i < showItems; i++) {
	            var scItem = items[i];
	            var productID = scItem.product.id;
	            var lineItemId = scItem.id;
	            var externalReferenceID = scItem.product.externalReferenceId;
	            productString = productString + externalReferenceID + ' ';
	            var qty = scItem.quantity;
	            var displayName = scItem.product.displayName;
	            var tagDisplayName = displayName.replace(/["]+/g, '&quot;');
	            var price = scItem.pricing.formattedSalePriceWithQuantity;
	            var priceConvert = price.replace(/[$,]+/g, '');
	            var rawPrice = parseFloat(priceConvert);
	            var imageSrc = scItem.product.thumbnailImage;
	            var imageShow;
	            if(imageSrc != null && imageSrc.indexOf("thumbnail/") > -1){
	            	imageShow = imageSrc.split("thumbnail/")[1];
	            }else{
	            	imageShow = imageSrc;
	            	 }
	            var row = '<div class="mini-cart-item" data-cart-price="' + rawPrice + '" data-cart-qty="'+qty+'">'
	                + '<div class="product-image"><img data-link_cat="mini cart click" data-link_id="minicart_view_product_'+productID+'" data-link_meta="link_name: view product>'+tagDisplayName+'" data-link_position="minicart" width="70" height="70" href="#" onclick="replaceUrl('+productID+');" src="' + imageShow + '"/></div>'
	                + '<div class="product-info"><div class="product-details"><span class="product-name"><a data-link_cat="mini cart click" data-link_id="minicart_view_product_'+productID+'" data-link_meta="link_name: view product>'+tagDisplayName+'" data-link_position="minicart" href="#" onclick="replaceUrl('+productID+');">' + displayName +'</a></span>'
	                + '<span class="remove-button"><a data-link_cat="remove from cart" data-link_id="minicart_cartremove_'+productID+'" data-link_meta="link_name: remove from cart>'+tagDisplayName+'" data-link_position="minicart" data-product_info="id:'+productID+'|prdMdlCd:'+externalReferenceID+'|name:'+tagDisplayName+'|price:'+price+'" href="javascript:removeItem('+lineItemId+')"></a></span>'
	                + '</div>'
	                + '<div class="purchase-details">'
	                + '<span class="quantity">QTY: ' + qty + '</span>'
	                + '<span class="product-price">' + price + '</span>'
	                + '</div>'
	                + '</div></div>';
	            outputHtml += row;
	        }
	        outputHtml += itemsEndHtml;
	        var subTotal = data.cart.pricing.formattedSubtotal;
	        var checkoutHref = $('.gnb-checkout-link').attr('href');
	        var token = '';
	        if($.cookie("dr_a_token")!=null){
	            token = $.cookie("dr_a_token");
	    	}else{
	    	    token = $.cookie("DR_SESSION_TOKEN");
	    	}
	        $('.gnb-checkout-link').add('.gnb-view-cart').attr('href',checkoutHref + token);
	        $CART_CONTAINER.prepend(outputHtml);
	        
	        $(".add-to-cart-modal.hidden-phone .purchase-info .number").text('SUBTOTAL ('+data.cart.totalItemsInCart+' Items)');
	        $(".add-to-cart-modal.hidden-phone .purchase-info .total").text(subTotal);
		$(".add-to-cart-modal-container .hidden-phone .purchase-option a").css({"pointer-events":'auto','color':'#20a2ff'}); 
		$(".add-to-cart-modal-container .hidden-phone .purchase-option button").attr("disabled",false);
		$(".add-to-cart-modal-container .hidden-phone .purchase-option button").css("background-color",'#308EEA');
		$(".add-to-cart-modal-container .add-to-cart-modal .modal-box .purchase-info .preloader .spinner").css({opacity:0});
		$(".preloader").hide();
		var subQty = 0;
		$('.mini-cart-item').each(function() {
		    var qty = parseInt($(this).data('cart-qty'));
		    subQty += qty;
		});
		$('.subQty').attr('data-cart-subQty', subQty);
		if (subQty == 1) {
		    $('.subQty').text('(' + subQty + ' item)');
		} else {
		    $('.subQty').text('(' + subQty + ' items)');
		}
		$('.sum-price').text(subTotal);
		if (isEppUser()) {
		    $('.gnb-checkout a').text('Checkout').attr('href', eppCheckOut);
		} else {
		    $('.gnb-checkout a').text('Checkout').attr('href', checkOut);
		}
		} else {
		    if (isIE()) {
			$('.gnb-b2c-icons-cart a').remove('svg').prepend('<svg viewBox="0 0 18.862 17.834" id="cart">'
						+ '<circle cx="5.83" cy="15.964" r="1.87"/>'
						+ '<circle cx="16.222" cy="15.964" r="1.87"/>'
						+ '<path d="M5.638 2.534v-.548C5.638.83 4.728 0 3.37 0H0v2.534h3.12v7.4c0 1.358 1.102 2.458 2.46 2.458h10.823c1.358 0 2.458-1.1 2.458-2.458v-7.4H5.64zm10.706 7.34H5.638V5.037h10.705v4.84z"/>'
						+ '<rect class="btn" fill="transparent" x="0" y="0" width="100%" height="100%" />'
						+ '</svg>');
		    } else {
			if (!$('.gnb-b2c-icons-cart a svg use').attr('xlink:href','../img/sprite.symbol.svg#cart')) {
			    $('.gnb-b2c-icons-cart a svg use').attr('xlink:href','../img/sprite.symbol.svg#cart');
			}
		    }
		    $('.cart-basket').text('');
		    if ($('.item-container').is(':empty')) {
			$('.item-container').append('<p class="gnb-empty-cart">Your shopping cart is empty.</p>');
		    }
		    $('.gnb-checkout a').text('Go To Shop').attr('href', 'http://samsung.com/us/shop');
		    showEmpty();
		    $.cookie("DR_CART_CONTENT", 0, {path : '/', domain : 'samsung.com'});
		}
	}
	
	function loadIECartSummary() {
		var $CART_CONTAINER = $(".cart-container");
		$.getJSON( dr_store_domain + '/store/samsung/DisplayDRCartSummary/Version.2/output.json?jsonp=?', {
			   format: "json"
		}).done(function( cartSummaryData ) {
			$(".cart-basket").text(cartSummaryData.lineItems);
			if (cartSummaryData && cartSummaryData.lineItems > 0) {
				$.cookie("DR_CART_CONTENT", 1, {path : '/', domain : 'samsung.com'});
				var timestamp = new Date().getTime();
				$.ajax({
		        url: dr_store_domain +'/integration/job/request/ShoppingCartService/defaults/site/?%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3CGet%20siteID%3D%22samsung%22%20locale%3D%22en_US%22%3E%3CbaseFields%3E%3CdisplayName/%3E%3C/baseFields%3E%3Cattributes%3E%3Cthumbnail/%3E%3C/attributes%3E%3C/Get%3E%3C%21--jsonp=smg.global.digitalRiver.cartSummaryCallback--%3E%3C%21--' +timestamp+ '--%3E',
		        	dataType: 'jsonp',
			        jsonp: false,
			        cache: true
			    });
			} else {
			    showEmpty();
			    $.cookie("DR_CART_CONTENT", 0, {path : '/', domain : 'samsung.com'});
			}
		});
	}
	
	function ieCartSummaryCallback(shoppingCartData) {
    	if (shoppingCartData && shoppingCartData["ns1:GetShoppingCartResponse"].errorCode == 0) {
    		var shoppingCartLineItems = shoppingCartData["ns1:GetShoppingCartResponse"].shoppingCartLineItems;
            if ( !$.isArray(shoppingCartLineItems) ) {
                shoppingCartLineItems = [shoppingCartLineItems]; //if 1 item in cart
            }
            var itemsCount = shoppingCartLineItems.length;
            var $CART_CONTAINER = $(".cart-container");
            var outputHtml = '';
            var productString = '';
            if (itemsCount > 0) {
                var showItems = itemsCount;
                if (itemsCount > 4) {
                    showItems = 4;
                }
                for (var i = 0; i < showItems; i++) {
                    var scItem = shoppingCartLineItems[i];
                    var productID = scItem.requisitionLineItemKey.productKey.productID;
                    var externalReferenceID = scItem.requisitionLineItemKey.productKey.externalReferenceID;
                    productString = productString + externalReferenceID + ' ';
                    var qty = scItem.quantity;
                    var displayName = scItem.lineItemProductInfo.baseFields.displayName;
                    var tagDisplayName = displayName.replace(/['"]+/g, "\\$&");
                    var price = scItem.lineItemProductInfo.pricing.formattedTotalPriceWithDiscount;
                    var imageSrc = '';
                    if (scItem.lineItemProductInfo.attributes.name == 'thumbnail') {
                        imageSrc = scItem.lineItemProductInfo.attributes.value;
                    }
                    imageSrc = imageSrc.indexOf('http') == 0 ? imageSrc : dr_store_domain + '/DRHM/Storefront/Company/samsungamericas/images/product/thumbnail/' + imageSrc;
                    var drPopupUrl = dr_store_domain +'/DRHM/store?Action=DisplayPage&SiteID=samsung&Locale=en_US&id=ProductInterstitialDetailsPage&parentPageName=Cart&productID=' + productID;
                    var row = '<div class="mini-cart-item"><div class="product-info">'
                        + '<div class="product-image"><img width="70" height="70" href="'+drPopupUrl+'" src="' + imageSrc + '"/></div>'
                        + '<div class="product-details"><span class="product-name"><a href="'+drPopupUrl+'">' + displayName +'</a>'
                        + '<span class="product-price">' + price + '</span></div>'
    	                + '<div class="purchase-details"><span class="quantity">QTY: ' + qty + '</span></div>'
                        + '</div></div>';
                    outputHtml += row;
                }
                var subTotal = shoppingCartData["ns1:GetShoppingCartResponse"].reqLevelPricing.formattedSubTotalPriceWithDiscount;
                outputHtml += '<div class="hidden-phone desktop-cart-total"><span class="sum-label">SUBTOTAL&nbsp;'+itemsCount+'</span>'
            		+ '<span class="sum-price">' + subTotal + '</span></div>'
            		+ '<div class="hidden-desktop hidden-tablet mobile-cart-total"><span>Total</span> <span>'+subTotal+'</span></div>'
            		+ '<div class="hidden-desktop hidden-tablet purchase-options"><a class="button sm sm-font" href="'+ dr_store_domain +'/store/samsung/cart"><span>VIEW CART</span></a>'
                 	+ '<a class="button sm sm-font" href="'+ dr_store_domain +'/DRHM/store?Action=DisplayThreePgCheckoutAddressPaymentInfoPage&SiteID=samsung&Locale=en_US"><span>Checkout</span></a></div>'
                 	+ '<div class="hidden-phone purchase-options"><a class="view-cart-link" href="'+ dr_store_domain +'/store/samsung/cart"><span>View Shopping Cart</span></a>'
                 	+ '<a class="button sm sm-font" href="'+ dr_store_domain +'/DRHM/store?Action=DisplayThreePgCheckoutAddressPaymentInfoPage&SiteID=samsung&Locale=en_US"><span>Checkout</span></a></div>'
                 	+ '<div class="hidden-desktop hidden-tablet chevron-up"><span class="icon-chevron-up"></span></div>';               
            }           
            $CART_CONTAINER.prepend(outputHtml);
    	}
	}
	return {
		isEppUser : isEppUser,
		loadPrice : loadPrice,
		loadCart : loadCart,
		cartSummaryCallback: ieCartSummaryCallback,
		eppCartCallback : eppCartCallback,
		dRCartCallback : dRCartCallback
	};

}(window, document, jQuery));
function fortune(cookie) {
    return String($.cookie(cookie))
    .replace(/<script>/g,'')
    .replace(/<\/script>/g,'')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function cleanCartContainer(){
	$("div").remove(".item-container");
	$(".sum-price").text('').data('cart-subtotal','');
	$(".subQty").text('').data('cart-subqty','');
	$("div").remove(".mobile-cart-total");
	$("div").remove(".chevron-up");
}
/*
 * Remove from Cart
 * */
function removeItem(id){
	cleanCartContainer();
	var loading='<div class="spinner" style="display: none;">'
	    	+'<div class="bounce1"></div>'
	    	+'<div class="bounce2"></div>'
	    	+'<div class="bounce3"></div>'
	    	+'<div class="bounce4"></div>'
	    	+'</div>';
	$(".cart-container .preloader").html(loading).show();
	$(".spinner").fadeIn();
	var accToken;
	if($.cookie("dr_a_token")!=null){
		accToken =$.cookie("dr_a_token");
	}else{
		accToken =$.cookie("DR_SESSION_TOKEN");
	}
	$.ajax({
		url : 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items/'+id,	
		type : 'DELETE',
		data:{token:accToken},
		error : function() {
			console.log("Error delete item"+id);
		},
		success : function() {	
			//console.log("Delete item done"+id);
			smg.global.digitalRiver.loadCart();
			$(".spinner").fadeOut(function(){$(this).remove();$(".preloader").hide();});
		}
	});
}
/*
 * Replace to PDP URL
 * */
function replaceUrl(id){
	$.ajax({
		url : 'https://api.digitalriver.com/v1/shoppers/me/products?expand=product.customAttributes.pdPageURL&apiKey=5de150dc29228095f9811cdf15ea5938&productId='+id,
		dataType: 'xml',
		error : function() {
			console.log("Error to get pdp page of product "+id);
		},
		success : function(products) {
			var pdp_link = $(products).find("customAttributes").find("attribute[name='pdPageURL']").text();
			window.location.href = pdp_link;
		}
	});
}

var accessToken;
if($.cookie("dr_a_token")!=null){
	accessToken =$.cookie("dr_a_token");
}else{
	accessToken =$.cookie("DR_SESSION_TOKEN");
}

var eppCheckOut ='https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("dr_a_token");
var checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("DR_SESSION_TOKEN");

var ieVersion = (function(){

    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');

    while (
        div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
        all[0]
    );

    return v > 4 ? v : undef;

}());

$(document).ready(function() {
    	$(".cart-container").prepend('<div class="preloader">');
	$('.add-to-cart-modal-container').focusout(function() {
		$('.add-to-cart-modal-container').css("display", "none");
	});
	
	$('#add-to-cart-cross').click(function(){
		$('.add-to-cart-modal-container').css("display", "none");
	});
	
	$('#add-to-cart-cross-mobile').click(function(){
		$('.add-to-cart-modal-container').css("display", "none");
	});
	
	$('.cart-mobile').focusout(function() {
		$('.cart-mobile').attr("style", "display: none;");
	});
	
	$(".continue-shopping").click(function(){
		$('.add-to-cart-modal-container').css("display", "none");
		if($.cookie("dr_a_token")!=null){
			window.location.href = eppCheckOut;
		}else{
			window.location.href = checkOut;
		}		
	});
	
	$(".add-to-cart-modal-container .checkout").click(function(){
		if($.cookie("dr_a_token")!=null){
			window.location.href = eppCheckOut;
		}else{
			window.location.href = checkOut;
		}		
	});
});

$(document).on("touchstart", ".hidden-desktop.hidden-tablet.chevron-up", function() {
	$('.flyout.cart-flyout.cart-mobile').css("display", "none");
	$('li.top.active a').trigger("touchstart");
	$('li.top.active a').trigger("click");
});
/*
 * Add to Cart Button
 * */
$(document).on("click", ".dr-ecom.button", function() {
	$.cookie("DR_CART_CONTENT", 1, {path : '/', domain : 'samsung.com'});
	var loader='<div class="spinner" style="opacity: 0;">'
                	+'<div class="bounce1"></div>'
                	+'<div class="bounce2"></div>'
                	+'<div class="bounce3"></div>'
                	+'<div class="bounce4"></div>'
                	+'</div>';
	$(".preloader").html(loader).show();
	$(".add-to-cart-modal-container .add-to-cart-modal .modal-box .purchase-info .preloader .spinner").css({opacity:1});	
	var accessToken;
	if(smg.global.digitalRiver.isEppUser() && $.cookie("dr_a_token")!=null){
		accessToken =$.cookie("dr_a_token");
		eppCheckOut ='https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("dr_a_token");
		$(".continue-shopping").attr("style","visibility:hidden");
	}else{
		$(".continue-shopping").attr("style","visibility:show");
		accessToken =$.cookie("DR_SESSION_TOKEN");
		checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("DR_SESSION_TOKEN");
	}
	var prdMdlCd = $(this).attr("model-cd");
	if(ieVersion < 10){
		window.location.href = 'http://samsung.com/us/shop/checkout/'+prdMdlCd;		
	}
	else{
	cleanCartContainer();	
	var parentRoot = $(this).parents();
	var item = $(this).parents('.product-module');
	var img = $(item).find(".img").find(".product-image").prop("src");
	var name = $(item).find(".product-title").text();
	var price = $(item).find(".product-details").find(".price").find(".amount").text();
	
	if(img==''||img==null){
		img = parentRoot.find(".img img").prop('src');
		name = $(item).parents().find(".product-details h3 a").prop("title");
		price = $(item).find(".sizeme-price").find(".price.span10").find("span.display_price").text();
	}
	if(name==''||name==null){
		name = $(parentRoot).find("h1.product-title").text();
		price = $("#product-lockup-desktop .price-module p.price span.amount").text();
	}
	if(price==''||price==null){
		price=$(item).find(".product-details").find(".price").text();
	}
	$(".add-to-cart-modal.hidden-phone img").prop("src",img);
	$(".add-to-cart-modal.hidden-phone .product-name").text(name);
	$(".add-to-cart-modal.hidden-phone .product-price").text(price);
	$(".add-to-cart-modal.hidden-phone .product-quantity").text('QTY: 1');	
	$.ajax({
		url : 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId='+prdMdlCd+'&token='+accessToken,
		type : 'POST',
		dataType: "text",
		error : function(error) {
			console.log("Error to post product to DR.");
			if($.cookie("dr_a_token")!=null){
			    requestEPPTokenAndTryAgain(prdMdlCd);
			}else{
			    requestTokenAndTryAgain(prdMdlCd);
						}
			},
		success : function(response) {
			//console.log(response);
			smg.global.digitalRiver.loadCart();
			}
	});
	$('.add-to-cart-modal-container').css("display", "block");	
	$(".add-to-cart-modal-container .hidden-phone .purchase-option a").css({"pointer-events":'none','color':'grey'});
	$(".add-to-cart-modal-container .hidden-phone .purchase-option button").attr("disabled",true);
	$(".add-to-cart-modal-container .hidden-phone .purchase-option button").css("background-color",'grey');
	}
});
function requestEPPTokenAndTryAgain(prdMdlCd){
	tryCount++;
	$.ajax({
		type: "GET",
		url:"http://samsung.com/us/shop/refreshtoken.us",
		dataType: "json",
		data:{
			eppReqSeq:eppReqSeq
		},
		success: function (tdata){
			if(tdata[0].response == 200){
				setToken(tdata[0]);
				eppCheckOut ='https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("dr_a_token");
				if(tryCount>2){
				    console.log("Please log in and try again.");                   	
				}else{
				    $.ajax({
                    			url : 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId='+prdMdlCd+'&token='+tdata[0].accessToken,
                    			type : 'POST',
                    			dataType: "text",
                    			error : function(error) {
                    					console.log("Error to post product to DR.");
                    				},
                    			success : function(response) {
                    					//console.log(response);
                    					smg.global.digitalRiver.loadCart();
                    				}		
                    			});
				}
			}
		}
	});
}
function requestTokenAndTryAgain(prdMdlCd){
	tryCount++;
	$.ajax({
        url : 'https://shop.us.samsung.com/store/samsung/SessionToken?apiKey=5de150dc29228095f9811cdf15ea5938&format=json',
        type : 'GET',
        async: false,
        contentType: "application/json",
        dataType:"jsonp",
        error: function(){
            console.log("error to get token");
        	},
        success: function (data) {
            $.cookie("DR_SESSION_TOKEN", data.access_token, {path : '/', domain : 'samsung.com'});
            checkOut = 'https://api.digitalriver.com/v1/shoppers/me/carts/active/web-checkout?themeID=39247700&token='+$.cookie("DR_SESSION_TOKEN");
            if(tryCount>2){
            	console.log("Please close browser and try again.");                   	
            }else{
            	$.ajax({
        		url : 'https://api.digitalriver.com/v1/shoppers/me/carts/active/line-items?format=json&externalReferenceId='+prdMdlCd+'&token='+data.access_token,
        		type : 'POST',
        		dataType: "json",
        		error : function(error) {
        			console.log("Error to post product to DR.");
        		},
        		success : function(response) {
        			//console.log(response);
        			smg.global.digitalRiver.loadCart();
        		}		
            	});
            }
        }
	});
}
function setMiniCartCookie(){
	$.cookie("DR_CART_CONTENT", 1, {path : '/', domain : 'samsung.com'});
}
$(document).on("click", "a[data-link_cat*='add to cart']", function(e) {
	setMiniCartCookie();
});
