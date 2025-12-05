#!/bin/bash
# System Health Check Script for Black Belt Platform
# Run this periodically to monitor system health

set -e

echo "======================================"
echo "Black Belt Platform - Health Check"
echo "======================================"
echo "Timestamp: $(date)"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local service=$1
    local status=$(docker compose -f docker-compose.production.yml ps -q $service 2>/dev/null)
    
    if [ -n "$status" ]; then
        local health=$(docker inspect --format='{{.State.Health.Status}}' $(docker compose -f docker-compose.production.yml ps -q $service) 2>/dev/null || echo "unknown")
        if [ "$health" = "healthy" ] || [ "$health" = "unknown" ]; then
            echo -e "${GREEN}✓${NC} $service: Running ($health)"
            return 0
        else
            echo -e "${RED}✗${NC} $service: Unhealthy ($health)"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $service: Not running"
        return 1
    fi
}

check_http_endpoint() {
    local url=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} $name: HTTP $response"
        return 0
    else
        echo -e "${RED}✗${NC} $name: HTTP $response"
        return 1
    fi
}

check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✓${NC} Disk space: ${usage}% used"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠${NC} Disk space: ${usage}% used (Warning)"
        return 0
    else
        echo -e "${RED}✗${NC} Disk space: ${usage}% used (Critical)"
        return 1
    fi
}

check_memory() {
    local usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    if [ "$usage" -lt 80 ]; then
        echo -e "${GREEN}✓${NC} Memory: ${usage}% used"
        return 0
    elif [ "$usage" -lt 90 ]; then
        echo -e "${YELLOW}⚠${NC} Memory: ${usage}% used (Warning)"
        return 0
    else
        echo -e "${RED}✗${NC} Memory: ${usage}% used (Critical)"
        return 1
    fi
}

# Initialize counters
total_checks=0
passed_checks=0

echo ""
echo "1. Docker Services Status"
echo "-------------------------"
for service in mongodb backend nginx; do
    total_checks=$((total_checks + 1))
    if check_service $service; then
        passed_checks=$((passed_checks + 1))
    fi
done

echo ""
echo "2. HTTP Endpoints"
echo "-----------------"
total_checks=$((total_checks + 1))
if check_http_endpoint "http://localhost:3000/health" "Backend Health"; then
    passed_checks=$((passed_checks + 1))
fi

total_checks=$((total_checks + 1))
if check_http_endpoint "http://localhost/health" "Nginx Health"; then
    passed_checks=$((passed_checks + 1))
fi

echo ""
echo "3. System Resources"
echo "-------------------"
total_checks=$((total_checks + 1))
if check_disk_space; then
    passed_checks=$((passed_checks + 1))
fi

total_checks=$((total_checks + 1))
if check_memory; then
    passed_checks=$((passed_checks + 1))
fi

echo ""
echo "4. Container Stats"
echo "------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" || echo "Unable to get stats"

echo ""
echo "5. Recent Logs (Errors)"
echo "-----------------------"
docker compose -f docker-compose.production.yml logs --tail=20 backend 2>/dev/null | grep -i "error" || echo "No recent errors"

echo ""
echo "======================================"
echo "Health Check Summary"
echo "======================================"
echo "Passed: $passed_checks/$total_checks checks"

if [ "$passed_checks" -eq "$total_checks" ]; then
    echo -e "${GREEN}Status: All systems operational${NC}"
    exit 0
elif [ "$passed_checks" -ge $((total_checks * 70 / 100)) ]; then
    echo -e "${YELLOW}Status: Some issues detected${NC}"
    exit 1
else
    echo -e "${RED}Status: Critical issues detected${NC}"
    exit 2
fi
