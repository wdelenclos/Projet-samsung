
/**
* Login check
*/
$(document).ready(function(){
checkIframeHeight();
});
function checkIframeHeight(){
	if(!isLogin()&&window.location.href.indexOf("/us/support/account") != 23){
		$('#support_iframe').height(1560);
	}
}
function isLogin(){
	
	var remoteId = getCookie("remoteId");
	var optVal = getCookie("iPlanetDirectoryProOptVal");

	if ((remoteId != null) && (remoteId != "")){
		
		return true;
	}else if((optVal != null) && (optVal != "")){
			
		loginUser(optVal);
		
	} else{
		return false;
	}		
}
function loginUser(val){
	var url= "http://sso-us.samsung.com/sso/profile/saLoginUser?optVal="+val;
	if(window.location.protocol =="https:"){
		url = "https://sso-us.samsung.com/sso/profile/saLoginUser?optVal="+val;
	}
   $.ajax({
        type: "POST",
        url: url,
        dataType: "jsonp",
        async: false,
        cache: false,
        jsonpCallback: "callbackSso",
		jsonp: "callback"
    });
}

function callbackSso(data){
	if(data.login){
	var loginLink = $('.login');
	 var logoutLink = $('.logout');
	 loginLink.text('HI, ' + getUserName());
	  $('.login-trigger').hover(function(){
          loginLink.addClass('account-open');
          $(".myaccount-dropdown").css({opacity:1, display:'block'});
      }, function(){
          loginLink.removeClass('account-open');
          $(".myaccount-dropdown").css({opacity:0, display:'none'});
          open = false;
      });
	  
	  hostName();
      loginLink.text('HI, ' + getUserName());
      logoutLink.click(function(){
         dropCookiesHistory(logoutLink.attr('href'));
      });
	}
}

 function hostName(){
    var hostName = location.hostname;
    var logout = $('.logout');

    if(hostName.indexOf('devus') !== -1 || hostName.indexOf('devwww') !== -1 || hostName.indexOf('dev') !== -1) {
        logout.attr("href" ,'http://sso-stg.us.samsung.com/sso/logout');
    }
    else if(hostName.indexOf('stgwww') !== -1 || hostName.indexOf('stgapp') !== -1) {
        logout.attr("href" ,'http://sso-stg.us.samsung.com/sso/logout');
    }
    else if(hostName.indexOf('stgweb') !== -1) {
        logout.attr("href" ,'http://sso-stg.us.samsung.com/sso/logout');
    }
    else {
        logout.attr("href" ,'http://sso-us.samsung.com/sso/logout');
    }

}
function dropCookiesHistory(href){
    var thisURL=document.URL;

    if(thisURL.indexOf("/us/appstore") >= 0){
        thisURL = thisURL.substring(0,thisURL.indexOf("/us/appstore"))+"/us/appstore";
        if(thisURL.indexOf("https://secureus") === 0){
            thisURL = thisURL.replace("https://secureus", "http://www");
        }
    }

    var finalURL = href + "?url=" + thisURL;

    $('.logout').attr("href", finalURL);

    deleteCookie("prof_country", "/", document.domain);
    deleteCookie("prof_prolist_saved", "/", "");
    deleteCookie("prof_id", "/", document.domain);
    deleteCookie("prof_lname", "/", document.domain);
    deleteCookie("prof_bpno_s", "/", document.domain);
    deleteCookie("prof_fname", "/", document.domain);
    deleteCookie("prof_login_success", "/", document.domain);
    deleteCookie("bvdisplaycode", "/", "");
    deleteCookie("bvproductid", "/", "");
    deleteCookie("bvpage", "/", "");
    deleteCookie("bvcontenttype", "/", "");
    deleteCookie("bvauthenticateuser", "/", "");
    deleteCookie("bzv_url", "/", "");
    deleteCookie("auth_flag", "/", "");
    deleteCookie("iPlanetDirectoryProOptVal", "/", document.domain);
    deleteCookie("iPlanetDirectoryPro", "/", document.domain);
    deleteCookie("tppid", "/", document.domain);
    deleteCookie("tmktid", "/", document.domain);
    deleteCookie("tmktname", "/", document.domain);
    deleteCookie("tlgimg", "/", document.domain);
    deleteCookie("taccessrtype", "/", document.domain);
    deleteCookie("dr_a_token", "/", document.domain);
    deleteCookie("dr_r_token", "/", document.domain);
    deleteCookie("work_email", "/", document.domain);
    deleteCookie("work_pin", "/", document.domain);
    sessionStorage.removeItem('eppPlanId');
    sessionStorage.removeItem('eppMarketId');
    sessionStorage.removeItem('finderPrdIaCd');

    $.ajax({
        url: "http://shop.us.samsung.com/store?Action=Logout&Locale=en_US&SiteID=samsung&sout=json",
        dataType:'jsonp',
        data:'jsonp=callbackLogout'

    });

    return true;
}
/**
* Logout
*/
function clearCookiesAndMakeFinalURL(hrefValue)
{
     var mainURL=document.URL;

	 if(mainURL.indexOf("/us/appstore") >= 0){ 
		 mainURL = mainURL.substring(0,mainURL.indexOf("/us/appstore"))+"/us/appstore";
		 if(mainURL.indexOf("https://secureus") == 0){
			 mainURL = mainURL.replace("https://secureus", "http://www");
		 }
	 }

     var finalURL=hrefValue+"?url="+mainURL;
     $(".logout").attr("href", finalURL);
    

     deleteCookie("prof_country", "/", document.domain);
     deleteCookie("prof_id", "/", document.domain);
     //deleteCookie("prof_prolist", "/", document.domain);
     deleteCookie("bvdisplaycode", "/", "");
     deleteCookie("bvproductid", "/", "");
     deleteCookie("bvpage", "/", "");
     deleteCookie("bvcontenttype", "/", "");
     deleteCookie("bvauthenticateuser", "/", "");
     deleteCookie("bzv_url", "/", "");
     deleteCookie("auth_flag", "/", "");
     
     $.ajax({

	url: "http://shop.us.samsung.com/store?Action=Logout&Locale=en_US&SiteID=samsung&sout=json",
	dataType:'jsonp',
	data:'jsonp=callbackLogout'

	  
     });
     return true;
}

function callbackLogout(data){

/*
var mainURL=document.URL;

	 if(mainURL.indexOf("/us/appstore") >= 0){ 
		 mainURL = mainURL.substring(0,mainURL.indexOf("/us/appstore"))+"/us/appstore";
		 if(mainURL.indexOf("https://secureus") == 0){
			 mainURL = mainURL.replace("https://secureus", "http://www");
		 }
	 }

     var finalURL=hrefValue+"?url="+mainURL;
     
location.href = finalURL;
*/
}
/**
* get UserName
*/
function getUserName() {
    var prof_fname = fortune("prof_fname");
    var name = "";

    try {
        if (prof_fname)
            name = prof_fname.substring(0, 10);
    } catch (e) {
    }

    return name;
}

function setCookie( name, value, expires, path, domain, secure )
{
	// set time, it's in milliseconds
	var today = new Date();
	today.setTime( today.getTime() );
	if ( expires ) {
		expires = expires * 1000 * 60 * 60 * 24;
	}
	var expires_date = new Date( today.getTime() + (expires) );
	document.cookie = name + "=" +( value ) +
	( ( expires ) ? ";expires=" + expires_date.toGMTString() : "" ) +
	( ( path ) ? ";path=" + path : "" ) +
	( ( domain ) ? ";domain=" + domain : "" ) +
	( ( secure ) ? ";secure" : "" );
}

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
$(function(){	
	if($.cookie("fromPage")=='prc'){
		var tarUrl = window.location.href.split('/us')[0];
		setCookie( "targetUrl", tarUrl+'/us/support/account', 0, '/', "samsung.com", '' );
	} else if(window.location.href.indexOf("marsLinkCategory") > -1){
		setCookie( "targetUrl", window.location.href, 0, '/', "samsung.com", '' );
	} else{
		var baseDomain = location.protocol + "//" + location.host;
		var referrer = document.referrer;
		if(!referrer||referrer=='http://www.samsung.com/us/support/account'||referrer=='http://sso-us.samsung.com/sso/logout?url=http://www.samsung.com/us/support/account/'){
			setCookie( "targetUrl", baseDomain + '/us/support/account', 0, '/', "samsung.com", '' );
		}else{
			if(referrer.slice(-1)=='/'){
				referrer = referrer.slice(0,-1);
			}
			if(referrer.indexOf('//www')>-1 && referrer.indexOf('https')==-1){
				referrer = referrer.replace('http','https');
			}
			setCookie( "targetUrl", referrer, 0, '/', "samsung.com", '' );
		}
		if(!!$('#support_iframe').attr('src')){
			var addressDomain = $('#support_iframe').attr('src').split('/sso/secure/urlAction?targetUrl=')[0];
			var addressTarget = $('#support_iframe').attr('src').split('/sso/secure/urlAction?targetUrl=http://')[1];
			if(!!addressDomain && !!addressTarget){
				$('#support_iframe').attr('src',addressDomain+'/sso/secure/urlAction?targetUrl=https://'+addressTarget);
			}
		}
	}
	
	if($.cookie('STA_USER_TYPE')=='DEALER'){
		$(".account .dropdown>ul>li>a").attr('href','http://support-us.samsung.com/stacyber/b2b/review_20/sta_b2b_index.jsp');
	}
});
