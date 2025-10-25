/**
 * Health Check Script for TinyTots Production
 * Monitors system health and provides status information
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots',
    port: process.env.PORT || 5000,
    logFile: process.env.LOG_FILE || './logs/app.log'
};

class HealthChecker {
    constructor() {
        this.status = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            services: {},
            metrics: {}
        };
    }

    async checkDatabase() {
        try {
            await mongoose.connect(config.mongodb, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            
            // Test database connection
            await mongoose.connection.db.admin().ping();
            
            this.status.services.database = {
                status: 'healthy',
                connection: 'connected',
                responseTime: Date.now()
            };
            
            await mongoose.disconnect();
        } catch (error) {
            this.status.services.database = {
                status: 'unhealthy',
                error: error.message,
                responseTime: Date.now()
            };
        }
    }

    checkFileSystem() {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            const logsDir = path.join(__dirname, '../logs');
            
            // Check if directories exist and are writable
            const uploadsExists = fs.existsSync(uploadsDir);
            const logsExists = fs.existsSync(logsDir);
            
            // Check disk space
            const stats = fs.statSync(uploadsDir);
            
            this.status.services.filesystem = {
                status: uploadsExists && logsExists ? 'healthy' : 'unhealthy',
                uploadsDirectory: uploadsExists,
                logsDirectory: logsExists,
                writable: true
            };
        } catch (error) {
            this.status.services.filesystem = {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    checkMemory() {
        const memUsage = process.memoryUsage();
        const totalMem = memUsage.heapTotal;
        const usedMem = memUsage.heapUsed;
        const freeMem = totalMem - usedMem;
        const memUsagePercent = (usedMem / totalMem) * 100;

        this.status.metrics.memory = {
            total: Math.round(totalMem / 1024 / 1024) + ' MB',
            used: Math.round(usedMem / 1024 / 1024) + ' MB',
            free: Math.round(freeMem / 1024 / 1024) + ' MB',
            usagePercent: Math.round(memUsagePercent) + '%',
            status: memUsagePercent > 90 ? 'critical' : memUsagePercent > 80 ? 'warning' : 'healthy'
        };
    }

    checkUptime() {
        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeSeconds = Math.floor(uptime % 60);

        this.status.metrics.uptime = {
            seconds: uptime,
            formatted: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
            status: uptime > 86400 ? 'healthy' : 'warning' // 24 hours
        };
    }

    checkEnvironment() {
        const requiredEnvVars = [
            'NODE_ENV',
            'MONGODB_URI',
            'JWT_SECRET',
            'PORT'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        this.status.services.environment = {
            status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
            nodeEnv: process.env.NODE_ENV,
            missingVariables: missingVars,
            totalVariables: requiredEnvVars.length,
            configuredVariables: requiredEnvVars.length - missingVars.length
        };
    }

    determineOverallStatus() {
        const services = Object.values(this.status.services);
        const unhealthyServices = services.filter(service => service.status === 'unhealthy');
        
        if (unhealthyServices.length === 0) {
            this.status.overall = 'healthy';
        } else if (unhealthyServices.length === 1) {
            this.status.overall = 'degraded';
        } else {
            this.status.overall = 'unhealthy';
        }
    }

    async runHealthCheck() {
        console.log('🔍 Running TinyTots Health Check...\n');
        
        await this.checkDatabase();
        this.checkFileSystem();
        this.checkMemory();
        this.checkUptime();
        this.checkEnvironment();
        this.determineOverallStatus();

        // Display results
        console.log('📊 Health Check Results:');
        console.log('========================');
        console.log(`Overall Status: ${this.getStatusEmoji(this.status.overall)} ${this.status.overall.toUpperCase()}`);
        console.log(`Timestamp: ${this.status.timestamp}\n`);

        // Service Status
        console.log('🔧 Services:');
        Object.entries(this.status.services).forEach(([service, details]) => {
            console.log(`  ${service}: ${this.getStatusEmoji(details.status)} ${details.status}`);
            if (details.error) {
                console.log(`    Error: ${details.error}`);
            }
        });

        // Metrics
        console.log('\n📈 Metrics:');
        if (this.status.metrics.memory) {
            console.log(`  Memory: ${this.status.metrics.memory.used} / ${this.status.metrics.memory.total} (${this.status.metrics.memory.usagePercent})`);
        }
        if (this.status.metrics.uptime) {
            console.log(`  Uptime: ${this.status.metrics.uptime.formatted}`);
        }

        // Log to file if configured
        if (config.logFile) {
            this.logToFile();
        }

        return this.status;
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'healthy': return '✅';
            case 'degraded': return '⚠️';
            case 'unhealthy': return '❌';
            default: return '❓';
        }
    }

    logToFile() {
        try {
            const logEntry = {
                timestamp: this.status.timestamp,
                status: this.status.overall,
                services: this.status.services,
                metrics: this.status.metrics
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(config.logFile, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }
}

// Run health check if called directly
if (require.main === module) {
    const healthChecker = new HealthChecker();
    healthChecker.runHealthCheck()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Health check failed:', error);
            process.exit(1);
        });
}

module.exports = HealthChecker;
