# 1. Run containers
dotenv -e .env.test -- docker-compose -f docker-compose.test.yml up -d

# Cleanup function to stop and remove containers after tests
function cleanup {
  echo "Cleaning up containers..."
  docker-compose -f docker-compose.test.yml down
}
trap cleanup EXIT

# 2. Wait for the DB and push the schema
sleep 3
dotenv -e .env.test -- prisma db push

# 3. Run the tests
echo "Running tests..."
dotenv -e .env.test -- jest --config ./test/jest-e2e.json --detectOpenHandles