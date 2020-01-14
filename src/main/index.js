import { app, BrowserWindow, ipcMain } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const md5 = require('js-md5');
//nodejs中的path模块
const path=require('path');
const fs = require('fs')
const LNDB = require('lndb')
const db = new LNDB('./')

// 初始类型
//const downloadItems = db.init('download')

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`
  
function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  //http://wallpaperswide.com/download/winter_nature_3-1920x1080.html?dw_url=download%2Fwinter_nature_3-&dw_ratio=hd&dlw_block_wide=960x600&dlw_block_hd=1920x1080&dlw_block_standard=800x600&dlw_block_mobile=540x960&dlw_block_dual=1920x600
    
  var downloadItems = new Map();

  function getDownloadItem(downloadpath) {
    if(downloadItems.has(md5(downloadpath))){
      var item = downloadItems.get(md5(downloadpath));
      return item;
    }else{
      return false;
    }
  }

  //主进程代码
  let downloadUrl
  let folderpath
  let command
  ipcMain.on('download', (evt, args) => {
      let url = JSON.parse(args);
      downloadUrl = url.downloadUrl
      folderpath = url.savePath
      command = url.command

      //开始下载
      if(command === 'startDownload') {
          mainWindow.webContents.downloadURL(downloadUrl);
          return ;
      }

      //暂停下载
      if(command === 'stopDownload') {
          var item = getDownloadItem(downloadUrl);
          if(item && !item.isPaused()){
              item.pause();
              return ;
          }
      }

      //恢复下载
      if(command === 'resumeDownload') {
          var item = getDownloadItem(downloadUrl);
          if(item && item.isPaused()) {
              item.resume();
              return ;
          }
      }

      //取消下载
      if(command === 'cancelDownload') {
        var item = getDownloadItem(downloadUrl);
        if(item){
          item.cancel();
          downloadItems.delete(md5(item.getURL()))
          return ;
        }
      }   
  });

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    //设置文件存放位置
    let filename = item.getFilename();
    //item.setSavePath(folderpath+`\\${filename}`);
    fs.stat(folderpath+`\\${filename}`, function(err, stat){
        if(stat&&stat.isFile()) {
            console.log('文件存在！');
            let time = new Date().getTime();
            item.setSavePath(folderpath+`\\${time}${filename}`);
        } else {
            item.setSavePath(folderpath+`\\${filename}`);
        }
    })
    downloadItems.set(md5(item.getURL()),item);
    console.log(item.getURL())

    item.on('updated', (event, state) => {
        if (state === 'interrupted') {
        console.log('下载中断但可以恢复！')
        } else if (state === 'progressing') {
            if (item.isPaused()) {
                console.log('下载已暂停')
            } else {
                /* downloadItem.getTotalBytes()
                返回Integer- 下载项目的总大小（以字节为单位）。

                如果大小未知，则返回0。

                downloadItem.getReceivedBytes()
                返回Integer- 下载项目的接收字节数。 */
                //console.log(`Received bytes: ${item.getReceivedBytes()}`)
                let download_percent = ((item.getReceivedBytes()/item.getTotalBytes())*100).toFixed(2);
                console.log(download_percent+'%');
                mainWindow.webContents.send('tips',download_percent);
            }
        }
    })
    item.once('done', (event, state) => {
        if (state === 'completed') {
        console.log('下载完成！')
        downloadItems.delete(md5(item.getURL()))
        mainWindow.webContents.send('tips', '下载完成')
        } else {
        console.log(`下载失败: ${state}`)
        }
    })
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
