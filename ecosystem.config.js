module.exports = {
    apps: [
      {
        name: "carrier-service",
        script: "dist/server.js",
  
        instances: 1,              
        exec_mode: "fork",         
  
        watch: false,
  
        env: {
          NODE_ENV: "production"
        },
  
        max_memory_restart: "300M",
  
        error_file: "logs/pm2-error.log",
        out_file: "logs/pm2-out.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss"
      }
    ]
  }
  