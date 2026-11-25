(()=>{
 window.HCMerchantAnalytics.mount(ITEMS);
 function route(){const target=new URLSearchParams(location.search).get('view')==='target';const label=target?'Target inspiration':'Sales & analysis';$('insight-title').textContent=label;$('insight-crumb').textContent=label;document.title=label+' · Luggage Atlas';$('catalog-view').hidden=true;$('executive-view').hidden=!target;$('analysis-view').hidden=target;$('more-research').hidden=target;if(target)renderOpportunities();else window.HCMerchantAnalytics.show();}
 route();
 // Display imported analytics title only once, as the page heading above the breadcrumb.
 const intro=document.querySelector('.ma-intro');if(intro)intro.querySelector('h2').hidden=true;
})();
