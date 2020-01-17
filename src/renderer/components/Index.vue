<template>
<div class="content">
  <div class="input">
    <label for="downloadUrl">下载地址:</label>
    <input placeholder="下载地址" name="downloadUrl" class="input_class" id="downloadUrl" style="width: 300px" />
  </div>
  <div class="input">
    <label>保存地址:</label>
    <input type="text" name="savePath" id="savePath" class="input_class" style="width: 300px" readonly />
    <Button type="primary" id="changePath" @click="choosePath">选择文件夹</Button>
  </div>
  <div class="input">
    <label>更新方式:</label>
    <RadioGroup v-model="update_type" @on-change="updateType" vertical>
        <Radio label="auto">
            <Icon type="social-auto"></Icon>
            <span>自动更新</span>
        </Radio>
        <Radio label="tips">
            <Icon type="social-tips"></Icon>
            <span>新版本提示更新</span>
        </Radio>
    </RadioGroup>
  </div>
  <div class="input">
    <Button type="success" size="small" id="download" ghost icon="md-download" @click="startDownload"></Button>
    <Button type="error" size="small" id="stop" ghost icon="md-pause" @click="stopDownload"></Button>
    <Button type="info" size="small" id="start" ghost icon="md-play" @click="resumeDownload"></Button>
    <Button type="warning" size="small" id="cancel" ghost @click="cancelDownload">取消下载</Button>
  </div>
  <div class="input" style="display:flex;align-items: center;">
    <div>
      <Circle :percent="percent" :stroke-color="color" :size="60">
        <Icon v-if="percent == 100" type="ios-checkmark" size="60" style="color:#5cb85c"></Icon>
        <span v-else style="font-size:14px">{{percents}}%</span>
      </Circle>
    </div>
    <div style="margin-left:20px;">
      <Button type="info" @click="openFile">打开文件</Button>
      <Button type="info" @click="openFileHandler">打开文件夹</Button>
    </div>
    <!-- <div>
      {{version}}
    </div> -->
    <div>
    <!-- <Button type="primary" @click="modela">普通组件使用方法</Button> -->
    <Button type="primary" @click="handCheckUpdate">检测更新</Button>
    
  </div>
  </div>
</div>
</template>

<script>
  import Download from '../../../static/download.js'
  const { dialog ,shell } = require('electron').remote
  const { ipcRenderer } = require('electron')
  const LNDB = require('lndb')
  const db = new LNDB('./')
  const json_package = require("../../../package.json");
  // 初始类型
  const download = db.init('download')
  const update = db.init('updateType')
  export default {
    name: 'Index',
    data() {
      return {
        percent: 0,
        percents: 0,
        color: '#2db7f5',
        file_path: '',
        version: json_package.version,      
        update_type: ''
      }
    },
    mounted() {
    //pg.set('key', {hello: 'lndb!'})

    // 读取类型信息
    //pg.get('key')

    // 删除指定key的缓存
    //pg.remove('key')

    // 清空类型下所有缓存
    //pg.clear()
    let updateType = update.get('updateType')
    if(updateType && updateType.txt) {
      this.update_type = updateType.txt
    }

    if(this.update_type == 'auto') {
      if(navigator.onLine){
        ipcRenderer.send("checkForUpdate");
      }
      ipcRenderer.send('isDownload');
      ipcRenderer.send('update',"update");
    }else if(this.update_type == 'tips') {
      if(navigator.onLine){
        ipcRenderer.send("checkForUpdate");
      }
      ipcRenderer.send('update',"autoCheckUpdate");
    }
    // 收到消息
    ipcRenderer.on("message", (event, text) => {
      this.$Modal.info({
        title: '检测更新',
        content: text ,
        width: 270 
      });
    });

    // 下载进度
    ipcRenderer.on("downloadProgress", (event, progressObj)=> {
      let progress = progressObj.percent | 0;
      this.$Modal.info({
        title: '检测更新',
        content: '下载进度：' + progress + '%',
        width: 270 
      });
    }); 

    // 安装
    ipcRenderer.on("isUpdateNow", () => {
        // 是否更新
        this.$Modal.confirm({
          title: '检测更新',
          content: '下载完成，是否立即安装？(安装需要重启应用)',
          okText: '更新',
          cancelText: '取消',
          onOk: () => {
            ipcRenderer.send("isUpdateNow");
            this.$Message.info('Clicked ok');
          },
          onCancel: () => {
            this.$Message.info('Clicked cancel');
          }
      });
    });

    // 检测到新版本
    ipcRenderer.on("updateAvailable", (event, message) => {
      this.$Modal.confirm({
        title: '检测更新',
        content: message,
        okText: '更新',
        cancelText: '取消',
        onOk: () => {
          ipcRenderer.send('isDownload');
          this.$Message.info('Clicked ok');
        },
        onCancel: () => {
          this.$Message.info('Clicked cancel');
        }
      });
    });

    /* // 网络可达情况下检测是否有新版本
        if(navigator.onLine){
            ipcRenderer.send("checkForUpdate");
        }
        // 收到消息
        ipcRenderer.on("message", (event, text) => {
          this.$Modal.info({
            title: '检测更新',
            content: text ,
            width: 270 
          });
        });

        // 下载进度
        ipcRenderer.on("downloadProgress", (event, progressObj)=> {
          let progress = progressObj.percent | 0;
          this.$Modal.info({
            title: '检测更新',
            content: '下载进度：' + progress + '%',
            width: 270 
          });
        }); 

        // 安装
        ipcRenderer.on("isUpdateNow", () => {
            // 是否更新
            this.$Modal.confirm({
              title: '检测更新',
              content: '下载完成，是否立即安装？(安装需要重启应用)',
              okText: '更新',
              cancelText: '取消',
              onOk: () => {
                ipcRenderer.send("isUpdateNow");
                this.$Message.info('Clicked ok');
              },
              onCancel: () => {
                this.$Message.info('Clicked cancel');
              }
          });
        });

        // 检测到新版本
        ipcRenderer.on("updateAvailable", (event, message) => {
          this.$Modal.confirm({
            title: '检测更新',
            content: message,
            okText: '更新',
            cancelText: '取消',
            onOk: () => {
              ipcRenderer.send('isDownload');
              this.$Message.info('Clicked ok');
            },
            onCancel: () => {
              this.$Message.info('Clicked cancel');
            }
          });
        }); */

    let downloadPath = download.get('downloadPath')
    if(downloadPath && downloadPath.txt) {
      let downloadFolder = document.querySelector("#savePath")
      downloadFolder.value = downloadPath.txt
    }

    },
    methods: {
      updateType() {
        //this.$Message.success(this.vertical)
        let upType = this.update_type
        update.set('updateType', upType)
      },
      handCheckUpdate() {
        if(navigator.onLine){
          ipcRenderer.send("checkForUpdate");
        }
        ipcRenderer.send('update',"handCheckUpdate");
      },
      openFileHandler() {
        /* let downloadPath = download.get('downloadPath')
        let path = downloadPath.txt */
        shell.showItemInFolder(this.file_path);
      },
      openFile() {
        shell.openItem(this.file_path)
      },
      /**
       * 选择文件夹
       */
      choosePath() {
        let downloadFolder = document.querySelector("#savePath")
        dialog.showOpenDialog({
          //默认路径
          //defaultPath :'D:/Documents/Downloads',
          //选择操作，此处是打开文件夹
          properties: [
              'openDirectory',
          ],
          //过滤条件
          filters: [
              { name: 'All', extensions: ['*'] },
          ]
        },function(res){
          if(res){
            downloadFolder.value = res[0]
            download.set('downloadPath',res[0])
          }
        })
      },
      /**
       * 开始下载
       */
      startDownload() {
        let downloadAddress = document.querySelector('#downloadUrl')
        let downloadFolder = document.querySelector("#savePath")
        if(downloadFolder.value != "" && downloadAddress.value != "") {
            //下载文件
            //渲染器进程代码
            ipcRenderer.on('tips', (event, tips) => {
                if(tips === '下载完成'){
                  this.percents = tips;
                  this.percent = 100
                  this.color = '#5cb85c';
                }else{
                  this.percents = tips;
                  this.percent = tips | 0
                }
            })

            ipcRenderer.on('file',(event, tips) => {
              this.file_path = tips;
            })
            
            ipcRenderer.send('download',JSON.stringify({
              downloadUrl: downloadAddress.value,
              savePath: downloadFolder.value,
              command: 'startDownload'
            }));
        } else if(downloadAddress.value=="") {
            alert("未填写下载地址");
        } else {
            alert("未选择文件夹")
        }
      },
      /**
       * 暂停下载
       */
      stopDownload() {
        let downloadAddress = document.querySelector('#downloadUrl')
        let downloadFolder = document.querySelector("#savePath")
        ipcRenderer.send('download',JSON.stringify({
              downloadUrl: downloadAddress.value,
              savePath: downloadFolder.value,
              command: 'stopDownload'
            }));
      },

      /**
       * 继续下载
       */
      resumeDownload() {
        let downloadAddress = document.querySelector('#downloadUrl')
        let downloadFolder = document.querySelector("#savePath")
        ipcRenderer.send('download',JSON.stringify({
              downloadUrl: downloadAddress.value,
              savePath: downloadFolder.value,
              command: 'resumeDownload'
            }));
      },

      /**
       * 取消下载
       */
      cancelDownload() {
        let downloadAddress = document.querySelector('#downloadUrl')
        let downloadFolder = document.querySelector("#savePath")
        ipcRenderer.send('download',JSON.stringify({
              downloadUrl: downloadAddress.value,
              savePath: downloadFolder.value,
              command: 'cancelDownload'
            }));
      }

    }
  }
</script>

<style>
.content{
  margin-top: 10px;
  margin-left: 10px;
}
.input{
  margin: 10px 0;
}
.ivu-modal-header {
  background-color: #cde;
}
.ivu-modal-body{
  background-color: #cde;
}
.ivu-modal-footer{
  background-color: #cde;
}
.input_class{
  display: inline-block;
  width: 100%;
  height: 32px;
  line-height: 1.5;
  padding: 4px 7px;
  font-size: 12px;
  border: 1px solid #dcdee2;
  border-radius: 4px;
  color: #515a6e;
  background-color: #fff;
  background-image: none;
  position: relative;
  cursor: text;
}
</style>
