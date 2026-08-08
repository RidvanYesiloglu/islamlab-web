(function(){
  var map=document.getElementById('miniMap');
  if(map){
    var colors=['#a83f35','#476d89','#b38536','#628060'];
    for(var i=0;i<92;i+=1){
      var p=document.createElement('i'),a=i*2.399,r=9+((i*37)%82),x=50+Math.cos(a)*r*.46,y=50+Math.sin(a)*r*.46;
      p.style.setProperty('--x',x+'%');p.style.setProperty('--y',y+'%');p.style.setProperty('--s',(3+(i%5))+'px');p.style.setProperty('--c',colors[i%colors.length]);p.style.setProperty('--o',(.28+(i%7)*.09));map.appendChild(p);
    }
  }
  var bars=document.getElementById('miniBars');
  if(bars){['MED12L','KDM5B','MMP1','SLC25A30','PTPN18','ENO2'].forEach(function(name,i){var s=document.createElement('span');s.dataset.k=name;s.style.setProperty('--n',(93-i*9)+'%');bars.appendChild(s);});}
}());
