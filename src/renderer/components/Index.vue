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
    <Button type="primary" @click="modela">普通组件使用方法</Button>
    <Modal width="300" v-model="modal1" :mask-closable="false" :mask="false" :title="title">
      <div v-if="type === tips">
        <h1>{{tips}}</h1>
      </div>
      <div style="display: flex;align-items: center;justify-content: center;" v-else-if="type === progress">
        <h3>下载中：</h3>
        <Circle :percent="progress" :stroke-color="color" :size="40">
          <Icon v-if="progress == 100" type="ios-checkmark" size="40" style="color:#5cb85c"></Icon>
          <span v-else style="font-size:10px">{{progress}}%</span>
        </Circle>
      </div>
      <div v-else></div>
    </Modal>
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
  export default {
    name: 'Index',
    data() {
      return {
        percent: 0,
        percents: 0,
        color: '#2db7f5',
        file_path: '',
        version: json_package.version,
        title: json_package.name,
        modal1: false,
        tips: '',
        progress: 0,
        type: 'tips'
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
    ipcRenderer.on("message", (event, text) => {
      this.modal1 = true
      this.type = 'tips'
      this.tips = text;
    });
    ipcRenderer.on("downloadProgress", (event, progressObj)=> {
      this.modal1 = true
      this.type = 'progress'
      this.progress = progressObj.percent || 0;
    });

    let downloadPath = download.get('downloadPath')
    console.log(downloadPath.txt)
    if(downloadPath && downloadPath.txt) {
      let downloadFolder = document.querySelector("#savePath")
      downloadFolder.value = downloadPath.txt
    }

    },
    methods: {
      modela() {
        this.modal1 = true;
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
