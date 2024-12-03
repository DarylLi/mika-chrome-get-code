// 下载
// document.getElementById('getCode').addEventListener('click', function () {
chrome.tabs.executeScript({
  code: `(async function(){
        function downloadURL(url, name) {
        var link = document.createElement('a')
        link.download = name
        link.href = url
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        delete link
      }
      function downloadFile(name, context) {
        var data = context
        var blob = new Blob([data], { type: 'text/txt' })
        var url = window.URL.createObjectURL(blob)
        downloadURL(url, name || 'unknow.txt')
      }
      function getExtraLinkStatic(code){
        return code.split("https").filter(e=>e.match(/\\.(jpg|png|gif)/)).map(e=>((e.split('://')[1]||'').match(/.*(jpg|png|gif)/)||[])[0]).filter(e=>e && (e.includes('/')||e.includes('.')))
      }
      function getExtraSvgLinkStatic(code){
        return code.split("https").filter(e=>e.match(/\\.svg/)).map(e=>((e.split('://')[1]||'').match(/.*svg/)||[])[0]).filter(e=>e && (e.includes('/')||e.includes('.')))
      }
      const srcdoc =
        document.getElementById('result').getAttribute('srcdoc') || ''
      const styleContent = (srcdoc
        .match(/<style>[\\s\\S]*<\\/style>/)?.[0]||'')
        .replaceAll(/<.?style>/g, '');
      let scriptContent = (srcdoc
        .match(/<script id="rendered-js"(.*)>[\\s\\S]*<\\/script>/)?.[0]||'')
        .replaceAll(/<.*script.*>/g, '');
        scriptContent = (scriptContent||'').replaceAll(
        /window.CP|if.*window.CP/g,
        (match) => '//'+match);
      const htmlContent = (srcdoc
        .match(/<body translate="no">[\\s\\S]*<script id="rendered-js"(.*)>/)?.[0]||srcdoc
        .match(/<body translate="no">[\\s\\S]*<.*body>/)?.[0]||'')
        .replaceAll(/<body translate="no">|<script id="rendered-js"(.*)>|<.*body>/g, '');
      //额外cdn js链接获取
      const cdnList = (htmlContent.match(/<script(.*)src=.*('|")/g)||[]).map(e=>e.match(/http(.*)js/)?.[0]);
      // svg格式和其他图片格式分开：svg为文本接受，图片用二进制
      //三方额外资源图片获取（解决外链跨域问题）
      let assetFiles = [...getExtraLinkStatic(styleContent),...getExtraLinkStatic(scriptContent),...getExtraLinkStatic(htmlContent)];
      let assetSvgFiles=[...getExtraSvgLinkStatic(styleContent),...getExtraSvgLinkStatic(scriptContent),...getExtraSvgLinkStatic(htmlContent)];
      let infoJSON = '{'+
        '"id":"'+window.location.href.split('fullpage/')[1].split('?')[0]+'",'
        +'"name":"'+document.title.replace(/"|'/g,'')+'",'
        +'"author":"unknow",'
        +'"preview":"'+window.location.href+'",'
        + (cdnList.length>0?('"cdnLinks":'+JSON.stringify(cdnList)+','):(''))
        +'"resource":"penfile/samplefolder/'+window.location.href.split('fullpage/')[1].split('?')[0]+'"'
      +'}';
      downloadFile('index.css', styleContent);
      downloadFile('index.js', scriptContent);
      downloadFile('index.html', htmlContent);
      const filedata = new FormData();
      const fileId = window.location.href.split('fullpage/')[1].split('?')[0];
      //获取外链图片资源blob
      async function getLinkBlob(assetFiles, formdata){
        for(var i=0;i<assetFiles.length;i++){
          let asset = assetFiles[i];
          let type = asset.match(/png|jpg|gif/)[0];
          let sp = asset.split('/');
          let name = sp[sp.length-1];
          const blob = await fetch('https://' + asset).then(res => {return res.blob()});
          formdata.append(name.split('.')[0], new Blob([blob], { type: blob.type }), name);  
          var url = window.URL.createObjectURL(blob)
          downloadURL(url, name || 'unknow.txt')
        }
      }
      //获取外链svg资源blob
      async function getSvgLinkBlob(assetSvgFiles, formdata){
        for(var i=0;i<assetSvgFiles.length;i++){
          let asset = assetSvgFiles[i];
          let type = asset.match(/svg/)[0];
          let sp = asset.split('/');
          let name = sp[sp.length-1];
          const blob = await fetch('https://' + asset).then(res => {return res.text()});
          formdata.append(name.split('.')[0], new Blob([blob], { type: 'text/txt' }), name);  
        }
      }
      //获取外链js资源blob
      async function getJsLinkBlob(assetJsFiles, formdata){
        for(var i=0;i<assetJsFiles.length;i++){
          let asset = assetJsFiles[i];
          if(!asset)return
          let type = asset.match(/js/)[0];
          let sp = asset.split('/');
          let name = sp[sp.length-1];
          try{
            const blob = await fetch(asset).then(res => {return res.text()});
            formdata.append(name.split('.')[0], new Blob([blob], { type: 'text/txt' }), name);  
          }
          catch(err){
            console.log(err)
          }
        }
      }
      filedata.append("fileId", fileId);
      await getLinkBlob(assetFiles, filedata);
      await getSvgLinkBlob(assetSvgFiles, filedata);
      // cdn 外链内容也保存本地吧 吐了 为什么会有人直接引codepen域名下自己的js啊
      await getJsLinkBlob(cdnList,filedata);
      // 添加静态图片资源项
      infoJSON = JSON.parse(infoJSON);
      infoJSON.assetList=[...assetFiles, ...assetSvgFiles];
      infoJSON = JSON.stringify(infoJSON);
      downloadFile('info.json', infoJSON);
      filedata.append("htmlfile", new Blob([htmlContent], { type: 'text/txt' }),'index.html');
      filedata.append("cssfile", new Blob([styleContent], { type: 'text/txt' }),'index.css');
      filedata.append("jsfile", new Blob([scriptContent], { type: 'text/txt' }),'index.js');
      //add codepen info
      fetch("https://franxxdaryl.site:8100/updateinfo", {
        body: infoJSON,
        headers: {
          "Content-Type": "application/json",
        },
        method: "post",
      });
      //add codepen flies
      fetch("https://franxxdaryl.site:8100/uploadfiles", {
        body: filedata,
        mode: 'no-cors',
        headers: {
          "Content-Type": "application/json",
        },
        method: "post",
      });
    })()`,
});
