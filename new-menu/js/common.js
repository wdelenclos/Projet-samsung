$(function() {
	var wlh = window.location.href;
	// var urls = ['/us/index.html','/us/explore/galaxy-s7-features-and-specs','http://techlife.samsung.com','/us/aboutsamsung','/us/support'];
	// function extenderHidden (element) {
	// 	if(wlh.indexOf(element) > -1 || window.location.pathname == "/us/"){
	// 		$('#heroext').css('display', 'none');
	// 	} else {
	// 		$('#heroext').css('display', 'block');
	// 	}
	// 	console.log(element, "testing", wlh.indexOf(element));
	// }
	// urls.forEach(extenderHidden);

	if (
        window.location.pathname == "/us/" ||
        wlh.indexOf("/us/index.html") > -1 ||
        wlh.indexOf("http://techlife.samsung.com/") > -1 ||
        wlh.indexOf("/us/aboutsamsung") > -1 ||
        wlh.indexOf("/us/experience/skills-workshop/") > -1 ||
        wlh.indexOf("/us/explore") > -1 ||
        wlh.indexOf("/us/shop/mothers-day/") > -1 ||
        wlh.indexOf("/us/support") > -1) {
        $('#globalext').css('display', 'none');
    } else {
        $('#globalext').css('display', 'block');
    }

	// HIDE CAMERA BEST SPEC FOR MOBILE PHONES COMPARE
	setTimeout(function(){
	if(document.location.href.indexOf('/us/compare/#category/N0000002/')>-1){
	    var cam=setInterval(function(){
		var $camSpec=$(".spec-category .spec-table .spec-row .compare-spec-item[data-spec-category='Camera']");
		if($camSpec.html()!=null){
		    $camSpec.find('.best-spec').remove();
		    clearInterval(cam);
		}
	    },500);
	}},1500);
	
	var eligibleModels = [
	            'RF34H9960S4/AA','RF34H9950S4/AA','RF24J9960S4/AA',
	            'RS27FDBTNSR/AA','RF23J9011SR/AA','RF23J9011SG/AA',
	            'RF28HMELBSR/AA','NE58K9850WG/AA','NE58K9850WS/AA',
	            'NX58K9850SG/AA','NX58K9850SS/AA','RF28K9580SG/AA',
	            'RF28K9580SR/AA','RF22K9581SG/AA','RF22K9581SR/AA',
	            'RF28K9380SG/AA','RF28K9380SR/AA','RF22K9381SG/AA',
	            'RF22K9381SR/AA','RF28K9070SG/AA','RF28K9070SR/AA',
	            'NE58H9970WS',   'NE58H9950WS',   'NX58K9850SG',
	            'NX58K9850SS',   'UN65KS9800FXZA/AA','UN78KS9800FXZA/AA',
	            'UN88KS9800FXZA/AA','UN85S9VFXZA','UN85S9FXZA',
	            'UN105S9WAFXZA','UN110S9VFXZA','UN110S9BFXZA',
	            'UN65JS9500FXZA','UN78JS9500FXZA','UN88JS9500FXZA'];
	if(document.location.href.indexOf('/us/support/owners/product')>-1 && eligibleModels.indexOf($('#prdMdlCd').val())>-1){		
		$('[href = "tel:18007267864"] .phone-number-1').text("1-888-480-5674");
		$('[href = "tel:18557754760"] .phone-number-1').text("1-888-480-5674");	
		$('[href = "tel:18007267864"] span').each(function(){
			if($(this).text() =='1-800-SAMSUNG'){
			    $(this).css('display', 'none');    	
			}		    	
		});
		$('[href = "tel:18557754760"] span').each(function(){
			if($(this).text() =='1-800-SAMSUNG'){
			    $(this).css('display', 'none');    	
			}		    	
		});
	}
});

function openPopup(pageUrl) {
	var opt = "toolbar=no,location=no,directories=no"
			+ ",resizable=yes,scrollbars=yes,status=no,width=1000,height=600,left=400,top=200";
	window.open(pageUrl, 'winPop', opt);
}
function extendBorderTop(){
	var width = jQuery(window).width();
	var resultCount = $( ".product-module" ).length;
	if(width > 420 && width < 869){
		if(resultCount % 2 == 1){
			$( ".row-fluid .filter-content" ).append("<div data-border=\"borderTopLine\" class=\"product-module\"></div>")
		}
	}
	else if(width > 870){
		if(resultCount % 3 == 1){
			$( ".row-fluid .filter-content" ).append("<div data-border=\"borderTopLine\" class=\"product-module\"></div>")
			$( ".row-fluid .filter-content" ).append("<div data-border=\"borderTopLine\" class=\"product-module\"></div>")
	}
		else if(resultCount % 3 == 2){
			$( ".row-fluid .filter-content" ).append("<div data-border=\"borderTopLine\" class=\"product-module\"></div>")
		}
}
}

function deleteBorder(){
	$('*[data-border="borderTopLine"]').remove();
}

function anchorRedirect(pageUrl, type, isSupport) {
	var url = pageUrl.split("^");
	var link = url[0];
	var anchor = url[1];

	if (type == "B2C") {
		if (isSupport == "1") {
			if (!!anchor)
				window.document.cookie = "contentMoveValue" + "="
						+ escape(anchor) + "; path=/; domain = samsung.com";
		} else if (!!anchor)
			window.document.cookie = "cookieConsumerMenu" + "="
					+ escape(anchor) + "; path=/; domain = samsung.com";
	} else if (type == "B2B") {
		if (!!anchor) {
			window.document.cookie = "cookieBusinessSecondMenu" + "="
					+ escape(anchor) + "; path=/; domain = samsung.com";
		}
	}

	window.location.href = link;
}

function initBackToTop() {
    //check if the page is b2C
    var pageURL = window.location.href;
    console.log("pageURL: " + pageURL);
    //If the page is b2C, remove the off switch for the BTT button
    if(pageURL.indexOf("us/business") > -1  || pageURL.indexOf("insights.samsung.com") > -1) {
        $('.back-to-top').removeClass('btt-desk-off');
        console.log("Turned on the BTT button");
    }
    //handle URL exceptions within B2B
    if(pageURL.indexOf("/us/business/discover/galaxy-s6/") > -1) {
        $('.back-to-top').addClass('btt-desk-off');
    }
    //browser window scroll (in pixels) after which the "back to top" link is shown
    var offset = 300,
      //browser window scroll (in pixels) after which the "back to top" link opacity is reduced
      offset_opacity = 1200,
      //duration of the top scrolling animation (in ms)
      scroll_top_duration = 700,
      //grab the "back to top" link
      $back_to_top = $('.back-to-top a');

    //hide or show the "back to top" link
    $(window).scroll(function(){
      ( $(this).scrollTop() > offset ) ? $back_to_top.addClass('btt-is-visible') : $back_to_top.removeClass('btt-is-visible btt-fade-out');
      if( $(this).scrollTop() > offset_opacity ) {
        $back_to_top.addClass('btt-fade-out');
      }
    });
  }


function scrollToPos(to, duration) {
    var suppDocEl = (document.documentElement && document.documentElement.scrollTop),
        start = suppDocEl || document.body.scrollTop,
        change = to - start,
        currentTime = 0,
        increment = 5;

    var animateScroll = function() {
        currentTime += increment;

        var val = easeInOut(currentTime, start, change, duration);

        if(suppDocEl) {
            document.documentElement.scrollTop = val;
        } else {
            document.body.scrollTop = val;
        }

        var wlh = window.location.href;
    	if (wlh.indexOf("/us/support/") > -1 ){
        if(currentTime < duration) {
            setTimeout(animateScroll, increment);
        }
    	}
    };

    animateScroll();
}

function easeInOut(currentTime, startValue, change, duration) {
    currentTime /= duration/2;

    if (currentTime < 1) {
        return change / 2 * currentTime * currentTime + startValue;
    }

    currentTime--;

    return -change / 2 * (currentTime * (currentTime - 2) - 1) + startValue;
}

function priceModule(item) {

	if (item.price == null || item.price == "")
		return "<div class='price-module'></div>";
	var result = "<div class='price-module'>";
	var price = $.trim(item.price);
	var retail_price = $.trim(item.retail_price);
	if(typeof (item.retail_price) != 'undefined' && item.retail_price != "" ){
		if($.trim(item.retail_price).indexOf("$") == 0) {
			retail_price = retail_price.substring(retail_price.indexOf("$")+1);
		}
	}
	var save_price = $.trim(item.save_price);
	var succ = true;
	var prdPriceDesc = "";
	var appliance = isHomeApplianceButNotVacuum();
	if(item.fromRR && item.ecommerce_flag == "false"){
		succ = false;
	}
	if (succ && parseFloat(("" + retail_price).replace(',','')) > 1 && item.retail_price.replace(",","") != item.price.replace(",","")) {

		if($.trim(item.retail_price).indexOf("$") != 0) {
			item.retail_price = "$" + $.trim(item.retail_price);
		}
		if($.trim(item.price).indexOf("$") != 0) {
			item.price = "$" + $.trim(item.price);
		}else{
			price = price.substring(price.indexOf("$")+1);
		}
		if($.trim(item.save_price).indexOf("$") != 0) {
			item.save_price = "$" + $.trim(item.save_price);
		}else{
			save_price = save_price.substring(save_price.indexOf("$")+1);
		}
		if(retail_price && parseFloat(("" + retail_price).replace(',','')) > 1) {
			result += "<p class='suggested'><span>Suggested Retail:</span><span class='amount'>";
			result += item.retail_price;
			result += "</span></p>";
		}
		if(price && parseFloat(("" + price).replace(',','')) > 1) {
			result += "<p class='price'><span>";
			if(appliance){
				result += "Suggested Promotional ";
			}
			else if (item.ecommerce_flag == "true") {
				result += "Your ";
			}
			result+= "Price:</span><span class='amount'>";
			result += item.price;
			result += "</span></p>";

		}
		if(save_price && parseFloat(("" + save_price).replace(',','')) > 1 && !appliance){
			result += "<p class='savings'><span>You Save:</span><span class='amount'>";
			result += item.save_price;
			result += "</span></p>";
		}

	} else {
		if($.trim(item.price).indexOf("$") != 0) {
			item.price = "$" + $.trim(item.price);
		}else{
			price = price.substring(price.indexOf("$")+1);
			price = parseFloat(("" + price).replace(',',''));
		}
		if(price && parseFloat(("" + price).replace(',','')) > 1) {
			if(appliance){
				result += "<p class='price'><span>Suggested Price:</span>";
			}else{
				result += "<p class='price'><span>Price:</span>";
			}
		result += "<span class='amount'>";
		result += item.price;
		result += "</span></p>";
		}
		item.prdPriceDesc = "";
	}


	result += "</div>";

	if(item.prdPriceDesc && typeof (item.prdPriceDesc) != 'undefined'){
		prdPriceDesc = item.prdPriceDesc;
	}

	result += "<p id='price-desc' class='price-desc'>"+prdPriceDesc+"</p>";



	return result;
}

function ecomModule(item) {
	var tagPrefix = typeof (item.tagPrefix) == 'undefined'? "": item.tagPrefix;
	var sectionName = typeof (item.sectionName) == 'undefined'? "": item.sectionName + ">";
	var price = $.trim(item.price).replace("$","").replace(",","");
	var tagProdInfo = "id:" + item.id + "|cat:" + item.prdIaName + "|name:" + _.escape(item.name) + "|price:" + price + "|cat_id:" + item.prdIaCd;
	var result = "";
	if(item.ecommerce_flag == "true" && item.stock_flag && item.stock_flag != 'N') {
		if ("P" == item.stock_flag) {
			result += "<a data-link_id='" + tagPrefix + "pre-order_" + item.id + "' data-link_cat='pre order' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:pre-order' " +
			" data-product_info='" + tagProdInfo + "' model-cd='" + item.id + "' class='add-to-cart dr-ecom button block-level'>PRE-ORDER</a>";

		} else {
			result += "<a data-link_id='" + tagPrefix + "cartadd_" + item.id + "' data-link_cat='add to cart' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:add to cart|order_flow:main' " +
			" data-product_info='" + tagProdInfo + "' model-cd='" + item.id + "' class='add-to-cart dr-ecom button block-level'>ADD TO CART</a>";
		}
	} else {
		//result += "<a data-link_id='" + tagPrefix + "shop_" + item.id + "' data-link_cat='product learn more' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:product learn more' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "' class='add-to-cart button block-level'>LEARN MORE</a>";
		result += "<a data-link_id='" + tagPrefix + "find_" + item.id + "' data-link_cat='find product' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:find online or locally' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "-buy' class='button alt block-level'>Find Online or Locally</a>";
	}

	if(item.hasMarketplaceLink != 'false') {
		result += "<a data-link_id='" + tagPrefix + "shop_" + item.id + "' data-link_cat='product learn more' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:product learn more' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "' class='add-to-cart button block-level'>LEARN MORE</a>";
		//result += "<a data-link_id='" + tagPrefix + "find_" + item.id + "' data-link_cat='find product' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:find online or locally' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "-buy' class='button alt block-level'>Find Online or Locally</a>";
	}

	return result;
}

function accEcomModule(item) {
	var tagPrefix = typeof (item.tagPrefix) == 'undefined'? "": item.tagPrefix;
	var sectionName = typeof (item.sectionName) == 'undefined'? "": item.sectionName + ">";
	var price = $.trim(item.price).replace("$","").replace(",","");
	var tagProdInfo = "id:" + item.id + "|cat:" + item.prdIaName + "|name:" + _.escape(item.name) + "|price:" + price + "|cat_id:" + item.prdIaCd;
	var result = "";
	if(item.ecommerce_flag == "true" && item.stock_flag && item.stock_flag != 'N') {
		if ("P" == item.stock_flag) {
			result += "<a data-link_id='" + tagPrefix + "pre-order_" + item.id + "' data-link_cat='pre order' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:pre-order' data-product_info='" + tagProdInfo + "' model-cd='" + item.id + "' class='add-to-cart dr-ecom dr-ecom button block-level'>PRE-ORDER</a>";
		} else {
			result += "<a data-link_id='" + tagPrefix + "cartadd_" + item.id + "' data-link_cat='add to cart' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:add to cart|order_flow:main' data-product_info='" + tagProdInfo + "' model-cd='" + item.id + "' class='add-to-cart dr-ecom button block-level'>ADD TO CART</a>";
		}
	} else {
		result += "<a data-link_id=" + tagPrefix + "find_" + item.id + "' data-link_cat='find product' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:find online or locally' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "-buy' class='button alt block-level'>Find Online or Locally</a>";
		//result += "<a data-link_id='" + tagPrefix + "shop_" + item.id + "' data-link_cat='product learn more' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:product learn more' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "' class='add-to-cart button block-level'>LEARN MORE</a>";
	}

	if(item.hasMarketplaceLink != 'false') {
		result += "<a data-link_id='" + tagPrefix + "shop_" + item.id + "' data-link_cat='product learn more' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:product learn more' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "' class='add-to-cart button block-level'>LEARN MORE</a>";
		//result += "<a data-link_id=" + tagPrefix + "find_" + item.id + "' data-link_cat='find product' data-link_position='" + sectionName + _.escape(item.id) + "' data-link_meta='link_name:find online or locally' data-product_info='" + tagProdInfo + "' href='" + item.linkURL + "-buy' class='button alt block-level'>Find Online or Locally</a>";
	}

	return result;
}

function familyOptions(product) {
	var result = "";
	if (typeof (product.options) == 'undefined' || product.options.length == 0)
		return "<div class='famliy-option'></div>";

	result += "<div class='famliy-option'>";
	var options = product.options;
	var optionName = "";

	//Family Option Check
	var mdlCdCollection = "";
	var variety = 0;
	for ( var i = 0; i < options.length; i++) {
		var item = options[i];
		if(item){
			if (optionName != item.option) {
				variety += 1;
				optionName = item.option;
			}
			var tempStr = "";
			var hasPrd = false;
			for ( var j = 0; j < item.product.length; j++) {
				tempStr += item.product[j] + ",";
				if (item.product[j] == product.id) {
					hasPrd = true;
				}
			}
			if(hasPrd){
				mdlCdCollection += tempStr;
			}

		}
	}
	optionName = "";

	for ( var i = 0; i < options.length; i++) {
		var item = options[i];
		if(item){
			if (optionName != item.option) {
				if (i > 0)
					result += "</ul></div>";
				var colorClass = item.option == "Color" ? "colors" : "";
				result += "<div class='customizations " + colorClass + "'><span class='custom-type'>"
						+ item.option + "</span><ul>";
				optionName = item.option;
			}

			var mdlCdStr = "";
			for (var k = 0; k < item.product.length; k++) {
				mdlCdStr += item.product[k] + ",";
			}
			if (mdlCdStr.length > 0)
				mdlCdStr = mdlCdStr.substring(0, mdlCdStr.length - 1);

			var optionType = "";
			if ("color" == item.option.toLowerCase()) {
				optionType = item.item.toLowerCase().trim().replace(/\s+/g, "-");
			}

			var hasPrd = false;
			var inCollection = variety > 1 ? false : true;
			for ( var j = 0; j < item.product.length; j++) {
				if (item.product[j] == product.id) {
					hasPrd = true;
					inCollection = true;
				}
				if(variety > 1 && mdlCdCollection.indexOf(item.product[j]) > -1){
					inCollection = true;
				}
			}

			if (hasPrd) {
				result += "<li class='selected'>";
			} else if (inCollection){
				result += "<li>";
			} else {
				result += "<li style='display:none'>";
			}

			if ("color" == item.option.toLowerCase()) {
				result += "<a data-modelCds='" + mdlCdStr + "' data-toggle='mini-tooltip' data-tooltip-copy='" + item.item + "' class='" + optionType
								+ "' style='position: relative;'>";
			} else {
				result += "<a data-modelCds='" + mdlCdStr + "'>";
				result += item.item.replace("^", "\"");
			}

			result += "</a></li>";
		}
	}

	if($.trim(result) !== "" && !endsWith(result, "</ul></div>"))
		result += "</ul></div>";

	result += "</div>";
	return result;
}


function ecorebateModule(item){
	var result = "";
	if(typeof (item.ecorebatesID) != 'undefined' && item.ecorebatesID!=""){
		result = "<div id='"+item.ecorebatesID+"' class='ecorebate' data-model-code='"+item.id+"'></div>"+
		"<script type='text/javascript'>"+
		"_ecr['"+item.ecorebatesID+"'] = '"+item.id+"'"+
		"</script>";
	}

	return result;
}

function reviewModule(item) {
	var tagPrefix = typeof (item.tagPrefix) == 'undefined'? "": item.tagPrefix;
	var sectionName = typeof (item.sectionName) == 'undefined'? "": item.sectionName;
	var price = $.trim(item.price).replace("$","").replace(",","");
	var tagProdInfo = "id:" + item.id + "|cat:" + item.prdIaName + "|name:" + _.escape(item.name) + "|price:" + price + "|cat_id:" + item.prdIaCd;

	var reviewUrl = item.linkURL + "-reviews";
	var result = "<div class='rating' itemprop='aggregateRating' itemscope itemtype='http://schema.org/AggregateRating'>";

	var submissionurl = "";
	var index = reviewUrl.indexOf("ct=");

	if(index != -1) {
		reviewUrl_sub = reviewUrl.substring(index + 3);
		submissionurl = reviewUrl_sub + encodeURIComponent("?bvaction=writereview");
	} else {
		if (!window.location.origin) {
			  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
		}
		reviewUrl = window.location.origin + reviewUrl;
		submissionurl = encodeURIComponent(reviewUrl + "?bvaction=writereview");
	}

	var submitReviewUrl = BAZZA_REVIEWS_URL + item.id.replace("/", "_") + "/writereview.htm?submissionurl=" + submissionurl;

	if (item.reviews > 0) {


		result += "<span class='stars " + reviewClass(item.rating + "") + "' title='" + item.rating + " stars' itemprop='ratingValue'>";
		result += item.rating;
		result += "</span>";
		result += "<a data-link_id='" + tagPrefix + "review_" + item.id + "' data-link_cat='review'  data-link_position='" + sectionName + "' data-link_meta='link_name:review' data-product_info='" + tagProdInfo + "' href='" + reviewUrl + "'>";
		result += "<span class='num-rating-wrapper'>(<span class='product-num-ratings' itemprop='reviewCount'>";
		result += item.reviews;
		result += "</span>)</span></a>";
		result += "</span>";

		result += "<a data-link_id='" + tagPrefix + "review_" + item.id + "' data-link_cat='review' data-link_position='" + sectionName.replace(">", "") + "' data-link_meta='link_name:review' data-product_info='" + tagProdInfo + "' href='" + submitReviewUrl + "' style='margin-left: 10px; display: inline;'>Write a review</a>";
	} else {

		result += "<div><a data-link_id='" + tagPrefix + "review_" + item.id + "' data-link_cat='review' data-link_position='" + sectionName.replace(">", "") + "' data-link_meta='link_name:review' data-product_info='" + tagProdInfo + "' href='" + submitReviewUrl + "' style='font-size:1em;'>Be the first to write a review</a></div>";
	}

	result += "</div>";

	return result;
}

function compareModule(item) {
	if(item.comparable != "true")
		return "";
	var result = "<div class='compare'><label for='compare-" + item.id + "'><input type='checkbox' name='compareCd' class='compare-check' value='" + item.id + "' id='compare-" + item.id + "'><span>Add to Compare</span></label>"
			+ "<a class='button sm alt' href='#' rel='" + item.id + "' style='display: none;'><b>Compare</b></a></div>";
	return result;
}

function compareModulePrice(item) {
	var price = "";
	if(item.price!=null && typeof (item.price) != 'undefined' && item.price != "" && Number(item.price.replace(',','')) >1){
		price = "$"+item.price;
	}
	var result =  "<p class='price' itemprop='price'>"+price+"</p>";
	return result;
}


function promotionModule(item) {
	if(typeof(item.promotion) == 'undefined' || item.promotion == null || item.promotion == "")
		return "";
	var imagePath = item.promotion.imgFileG;
	var content = item.promotion.contG;
	var contHtml = item.promotion.contHtmlG;
	var subContent = item.promotion.subContG;
	var subContText = item.promotion.subContTextG;
	if(item.promotion.viewType == "L") {
		imagePath = item.promotion.imgFileL;
		content = item.promotion.contL;
		contHtml = item.promotion.contHtmlL;
		subContent = item.promotion.subContL;
		subContText = item.promotion.subContTextL;
	}

	var result = "";
	if("I" == item.promotion.promType) {
		result += "<div class='promo-clear'><a class='promo-img' href='" + item.promotion.linkUrl + "' target='_blank'><img src='" + imagePath + "' style='width:100%;padding:0;'></a>";
	} else if("T" == item.promotion.promType) {
		result += "<div class='promo'>";
		if(item.promotion.linkUrl != null && item.promotion.linkUrl != ''){
			result += "<a class='promo-img' href='" + item.promotion.linkUrl + "' target='_blank'><img src='" + imagePath + "' ></a>";
		}else{
			result += "<a class='promo-img'><img src='" + imagePath + "' ></a>";
		}
		result += "<p>" + content;
		if (subContent != null && subContent != "") {
			result += "<span>" + subContent + "</span>";
		}
		if (item.promotion.promLnkYn != null && "Y" == item.promotion.promLnkYn) {
			result += "<a href='" + item.promotion.promLnkUrl + "'target='_blank'>" + item.promotion.promLnkTitle + "</a>";
		}
		result += "</p>";
		} else {
		result += "<div class='promo-clear' ><p>" + contHtml;
		if (subContText != null && subContText != "") {
			result += "<span>" + subContText + "</span>";
		}
		if (item.promotion.promLnkYn != null && "Y" == item.promotion.promLnkYn) {
			result += "<a href='" + item.promotion.promLnkUrl + "'target='_blank' style='font-size:1.0em;'>" + item.promotion.promLnkTitle + "</a>";
		}
		result += "</p>";
	}

	result += "</div>";
	return result;
}

function featuresModule(features) {
	var result = "";
	if(features != "searchnoresult" || typeof(features) != 'undefined' || features!= "") {
		var featureAry = features.split("@@@");
		for(var i = 0; i < featureAry.length; i++) {
			result += "<li>" + featureAry[i] + "</li>";
		}
		return result;
	}else if (features == "searchnoresult"){
		return "";
	}
}

function specModule(item) {
	var result = "<dl>";
	var specAry = item.specs.split("@@@");
	var specTitle=$(".compare-product dt:nth-child(odd)");
	var attribute=[],sp;
	for(var i=0; i<specTitle.length;i++){
		/*** MANTIS 4164 ***/
		var $tmp=$('span',specTitle[i]).clone();
		$tmp.children('div').remove();
		sp = $tmp.html().trim();
		attribute.push(sp);
	}
	var specList = checkAttribute(attribute, specAry);
	for(var i = 0; i < specList.length; i++) {
		var keyValue = specList[i].split("^^");
		var k=keyValue[1].toLowerCase();
		if(k=='' || k==' ' || k=='no' || k=='-' || k=='n/a' || k=='na'){keyValue[1] = 'N/A';}
		var $tr=$("<dt></dt><dd>" + _.unescape(keyValue[1]) + "</dd>");
		$tr[0].innerHTML=keyValue[0];
		$tr[0].innerHTML=$tr[0].textContent;
		result+=$tr[0].outerHTML+$tr[1].outerHTML;
	}
	result += "</dl>";
	return result;
}

/*** MANTIS 4164 ***/
function checkAttribute(att, prod){
    var arr = [], k, i;
    for (k = 0; k < att.length; ++k){
        var exists = false;
        for (i = 0; i < prod.length; ++i){
        	var cmp=$('<textarea/>').html(prod[i]).text().split('^^');
            if(cmp[0].indexOf(att[k]) > -1 && cmp[0].length <= att[k].length){
               arr.push(prod[i]);
               var exists = true;
               break;
            }
        }
        if (!exists){
            arr.push(att[k]+"^^N/A");
        }
    }
return arr;
}
/*** MANTIS 4189 ***/
function clearEmpty(){

		var specRows=$(".compare-product dt:nth-child(odd)");
		var orig=$(".compare-product dd");
		var prod=$("#compare-carousel dl");
		var ct=0;

			for(var i=0; i<$(orig).length; i++){
				$(prod).each(function(k){
					if($(orig[i]).html() != null){
						if(($(orig[i]).html().toLowerCase() == 'n/a') && ($($("dd",prod[k])[i]).html().toLowerCase() == 'n/a'))
						{ct++;}
						if(ct>=prod.length){
						$.when($($(orig[i]).prev()).remove()).then($(orig[i]).remove());
							$(prod).each(function(x){
								$($("dt",prod[x])[i]).remove();
								$($("dd",prod[x])[i]).remove();
							});
							ct=0;
							if(i!=0) i--;
							orig=$(".compare-product dd");
							prod=$("#compare-carousel dl");
						}
					}
				});
				ct=0;
			}
			$(".compare-container .swiper-wrapper,.compare-container .swiper-slide").css('height', 'auto');
	if(!isMobile()){
	$(".compare-container .compare-product .tooltipQ").parent().hover(
			function(){$('.tooltip',this).stop().show();},
			function(){$('.tooltip',this).stop().hide();}
		);
	}else
	{
		$(".compare-container .compare-product .tooltipQ").parent().parent().on("mouseenter mouseleave",function(){
			$('.tooltip',this).toggle();
		});
	}
}

function reviewClass(rating) {
	rating = rating + "";
	var result = "stars_";
	if(rating.length == 1) {
		rating = rating + ".0";
	}
	var ratingAry = rating.split(".");
	var first = ratingAry[0];
	var second = "0";
	if (ratingAry.length > 1)
		second = ratingAry[1];

	if (second == "0" || second == "1" || second == "2" || second == "8"
			|| second == "9") {
		if (second == "8" || second == "9") {
			first = parseInt(first) + 1;
		}
		second = "0";
	} else {
		second = "5";
	}
	return result + first + "_" + second;
}

function getLinkPosition(item) {
	if(typeof (item.sectionName) == 'undefined')
		return "";
	return 'data-link_position="' + item.sectionName + '"';
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function moveToSupport(pageUrl, anchor) {
	window.document.cookie = "contentMoveValue" + "=" + escape(anchor)
			+ "; path=/; domain = samsung.com";
	window.location.href = pageUrl;
}

function getCookie(key) {
	return $.cookie(key);
}

function deleteCookie(name, path, domain)
{

	domain = "samsung.com";
	if (getCookie(name)) {
		document.cookie = name + '=' +
			((path) ? ';path=' + path : '') +
			((domain) ? ';domain=' + domain : '' ) +
			';expires=Thu, 01-Jan-1970 00:00:01 GMT';
	}
}

function formatDate(formatDate) {
	//formatDate = 2011-07-22T21:55:37.000+00:00;
	var arr_months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	if ("" != formatDate && null != formatDate){
		var year = formatDate.substr(0,4);
		var month = arr_months[parseInt(formatDate.substr(5,2),"10")-1];
		var date = formatDate.substr(8,2);
		return month + " " + date + ", " + year;
	}
	return "";
}

function isMobile(){
	if($("meta[device]").attr("device") == "mobile" || window.innerWidth < 769)
		return true;
	return false;
}

function setPgmCookie(){
	  var domain = "samsung.com";
	  var pgm_em = "pgm_em";
	  var pgm = "pgm";
	  var val = getUrlVars(pgm_em);
	  var succ = 0;
	  if(val && getCookie(pgm_em)){
	  	succ = 1;
	  }else if(val){
	  	succ = 2;
	  }
	  if(succ == 2) {
	  	$.cookie(pgm, val,{path: '/', domain: domain});
	  	$.cookie(pgm_em, val,{path: '/', domain: domain});
	  }else if(succ ==0){
	  	deleteCookie(pgm_em, "/", domain);
	  	if(!val){
	  		val = getUrlVars(pgm);
		}
		if(val){
	  		$.cookie(pgm, val,{path: '/', domain: domain});
	  	}

	  }

}


function getUrlVars(name)
{
    var  hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {

        hash = hashes[i].split('=');
        if(hash[0] == name && hash[1]){
        	return hash[1];
        }

    }
    return "";
}

function getShopAccFlags(product){
	var flagHTML = '<div class="shop-flag-wrapper">';

	if(product[0].flTypCd){
		flagHTML += '<div class="shop-flags newest-product">Deal</div>';
	}

	if(product[0].flTypCd){
		flagHTML += '<div class="shop-flags special-offers">Limited Offer</div>';
	}

	if(product[0].flTypCd){
		flagHTML += '<div class="shop-flags featured-product">Top Featured</div>';
	}

	flagHTML += '</div>';

	return flagHTML;
}

function printThis(){
	var featureToggled = false;
	var specsToggled = false;
	if ($("#more-features").is(':hidden')){
		$("#more-features").show();
		$(".show-hide-features .button").html("See Less Features<i class='chevron-down inverted'></i>").data("expanded", "true");
		featureToggled= true;
	}

	if ($("#full-specs").is(':hidden')){
		$("#full-specs").show();
		$(".show-hide-specs .button").html("Hide Full Specs<i class='chevron-down inverted'></i>").data("expanded", "true");
		specsToggled = true;
	}

	var div = $("#main").find(".bottom-mobile-lockup");
	$(div).removeClass("visible-phone");
	$(div).removeClass("non-side-by-side-mobile");
	$(div).hide();
	window.print();
	setTimeout(function() {
		if(featureToggled){
			$("#more-features").hide();
			$(".show-hide-features .button").html("See More Features<i class='chevron-down'></i>").data("expanded", "true");
		}

		if(specsToggled){
			$("#full-specs").hide();
			$(".show-hide-specs .button").html("See Full Specs<i class='chevron-down'></i>").data("expanded", "true");
		}
		$(div).addClass("visible-phone");
		$(div).addClass("non-side-by-side-mobile");
		$(div).show();
    }, 500);

}


$( document ).ready(function() {
	if($("input[id='viewType']").length>0 && $("#results").length>0){
		var value = $("input[id='viewType']").val();
		if(value == "G"){
			$("#results").removeClass("list");
		}else if(value == "L"){
			$("#results").addClass("list");
		}
	}

	if(isHomeApplianceButNotVacuum() && window.location.href.indexOf("us/shop/home-appliance-holiday-offers") < 0
			&& window.location.href.indexOf("us/shop/black-friday") < 0){
			replacePriceModule();
		}

	$(".promo-margin").closest(".promo").css({"min-height":"0","border":"0"});

	$(".show-more").click(function(e){
		if($($(this).attr('data-target')).css('display')!='none' && !isMobile()){
			$.transit.enabled=false;
			window.scrollTo(0,$('header', $(this).attr('data-scroll-target')).position().top);
			setTimeout(function(){$.transit.enabled=true;},500);
		}
	});

	$(document).ready( function() {
	    var overiFrame = -1;
	    $('iframe').hover( function() {
	        overiFrame = $(this).closest('#main').attr('role');
	    }, function() {
	        overiFrame = -1;
	    });
	    $(window).blur( function() {
	        if( overiFrame != -1 )
	        	$('li.top.submenu.open').trigger("click");
	    });
	});

	$(".registerDevice").click(function(e){
		$.cookie("fromPage", "prc", {path : '/', domain : 'samsung.com'});
	});

	$(document).on("click", ".registerDevice", function(e) {
		$.cookie("fromPage", "prc", {path : '/', domain : 'samsung.com'});
	});

	$(document).on("click", "a[data-link_position*='Write a Review']", function(e) {
		$.cookie("fromPage", "review", {path : '/', domain : 'samsung.com'});
	});

	$(document).on("click", "a[data-link_position*='write a review']", function(e) {
		$.cookie("fromPage", "review", {path : '/', domain : 'samsung.com'});
	});
	
	$(document).on("click", "a[data-link_position*='first review']", function(e) {
		$.cookie("fromPage", "review", {path : '/', domain : 'samsung.com'});
	});
	setRecentViewedCookie();

$('.gnb-footer .back-to-top').on('click', function(e) {
    e.preventDefault();

    scrollToPos(0, 300);
});

//initialize the back-to-top button
initBackToTop();
});

function isHomeApplianceButNotVacuum(fromRR){

	var url = "";
	if(typeof(fromRR) == 'undefined' || !fromRR){
		url = $(".product-module").find("h3.product-title a").attr("href");
	}

	var result =false;
	if(!url || typeof(url) == 'undefined'){
		var withHash = window.location.href.substr(0, window.location.href.indexOf('#'));
		if(withHash){
			url = withHash.split(window.location.host)[1];
		}else{
			url = window.location.href.toString().split(window.location.host)[1];
		}
	}
	var rel = url.split("/");
	if(rel && rel.length > 3){
		if(rel[2] == 'appliances' && rel[3].indexOf('-accessories') == -1){
			result =true;

		}
			if(!result){
				if(url.indexOf('richrelevance.com') != -1){
					if(url.indexOf('appliances') != -1 && url.indexOf('-accessories') == -1){
						result =true;
					}
				}
			}
	}
	return result;
}


function replacePriceModule(){

		$SELECTOR = $(".product-module");


		$SELECTOR.each(function() {
			var type= $(this).data("type");

			if("accessory"!=type){
				var url = $(".product-module").find("h3.product-title a").attr("href");
				if(type== "product" || (url && typeof(url) != 'undefined'&& url.indexOf('-accessories') == -1)){
					var div = $(this).find(".price-module").find(".suggested");
					if(div && div.length > 0 ){
						$(this).find(".price-module").find(".price :nth-child(1)").text("Suggested Promo Price:");
						$(this).find(".price-module").find(".savings").hide();
					}else{
						$(this).find(".price-module").find(".price :nth-child(1)").text("Suggested Price:");
					}
				}

			}

		});

}


function alignBorder($SELECTOR,numberOfRows){
	/*var numberOfRows = $container.find(".row-fluid").data("number_each_row");
	var $SELECTOR = $container.find(".row-fluid").find(".product-module");*/
	var loop_count = parseInt($SELECTOR.length / numberOfRows);
	if ($SELECTOR.length % numberOfRows > 0)
		loop_count++;
		console.log(loop_count);
	for ( var i = 0; i < loop_count; i++) {
		var start = i * numberOfRows;
		var end = (i + 1) * numberOfRows;
		if (i == (loop_count - 1)) {
			end = $SELECTOR.length;
			$SELECTOR.slice(start, end).each(function() {
				if(!$(this).hasClass("last")){
					$(this).addClass("last");
				}

			});
		}else{
			$SELECTOR.slice(start, end).each(function() {
				if(!$(this).hasClass("first")){
					$(this).addClass("first");
				}
			});
		}

	}
}


function setRecentViewedCookie()
{
	var name = "pdp_ck=" ;
	if($("#recent_view").length>0){
		var value =  $("#recent_view").val();
		var d = new Date();
		d.setTime(d.getTime() + (365*24*60*60*1000));
		var expires = "expires="+d.toGMTString();
		var domain_string =  "; domain=samsung.com" ;
		var pdp_list="";
		var ca = document.cookie.split(';');
		for(var i=0; i<ca.length; i++) {
		    var c = ca[i];
		    while (c.charAt(0)==' ')
		    	c = c.substring(1);
		    if (c.indexOf(name) == 0)
		    	pdp_list =  c.substring(name.length,c.length);
	    }
		var pdp_ck = value;
		var pdp_temp = pdp_list.split("@@");
		for ( var j = 0; j< pdp_temp.length; j++){
			if(j<9 && value != pdp_temp[j])
				pdp_ck += "@@" + pdp_temp[j];
		}
		document.cookie = name+pdp_ck+"; "+ expires+";path=/"+domain_string;
	}


}

var gnbLazyLoad = function() {
	var navExecuted = false;
	var $gnbTopMenu = $('.header-bottom .top.submenu');

	fireLazyLoad = function() {
		var $gnbImages = $('.gnb-header img');

		if(!navExecuted) {
			$gnbImages.each(function(){
				$(this).attr('src', $(this).attr('source'));
			});
			navExecuted = true;
		}
	}

	$gnbTopMenu.on('click', function() {
		fireLazyLoad();
	});

	$(window).load(function() {

		if (!navExecuted) {
			fireLazyLoad();
		}
	});
}
gnbLazyLoad();

function removeTabPrice(){
	var curHref = location.href;
	if(curHref.indexOf('business') > -1 && curHref.indexOf('search') > -1){
        $.each( $('.price.span10'), function() {    
	        if($(this).children('a').attr("href", "tab")){
	        	$(this).children().remove();	
	        }	        	
        });
	}	
}

function directTVSeries(){
	var curHref = location.href;
	if(curHref.indexOf('us/video/tvs') > -1 ){
		$.each($('#category-top .swiper-slide a'), function(){	    
		    	switch ($(this).attr('data-link_id')){ 
		    	case 'cat_TVs_Series_9 Series': 
		    		$(this).attr('href','/us/video/tvs/all-products?filter=9series')
		    		break;
		    	case 'cat_TVs_Series_8 Series': 
		    		$(this).attr('href','/us/video/tvs/all-products?filter=8series')
		    		break;
		    	case 'cat_TVs_Series_7 Series': 
		    		$(this).attr('href','/us/video/tvs/all-products?filter=7series')
		    		break;		
		    	case 'cat_TVs_Series_6 Series': 
		    		$(this).attr('href','/us/video/tvs/all-products?filter=6series')
		    		break;
		    	case 'cat_TVs_Series_5 Series': 
		    		$(this).attr('href','/us/video/tvs/all-products?filter=5series')
		    		break;		
		    }			    	
		});    					
	}	
}

function redirectTVSearch(){
	var curHref = location.href;
	if(curHref.indexOf('us/search/business') > -1 ){
		  $('.product-details').each(function() {
		      if($(this).find('.product-title').find('a').attr('href').indexOf('hospitality-tvs') > -1 || $(this).find('.product-title').find('a').attr('href').indexOf('healthcare-tvs') > -1 ){
		          $(this).find('.cta.span18').find('a').attr('href', 'mailto:Iml.samsung@ingrammicro.com');
				  $(this).find('.cta.span18').find('a').removeAttr( "target" );
		      }
		  });
	  }
}

$(window).bind("load", function() {
	extendBorderTop();

	$( window ).resize(function() {
		deleteBorder();
		extendBorderTop();
	});
	removeTabPrice();
	directTVSeries();
	redirectTVSearch();
});