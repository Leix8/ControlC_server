import time
import logging
logger = logging.getLogger(__name__)

def main():
    logging.basicConfig(filename='task.log', level=logging.INFO)
    time.sleep(5)
    logger.info("task finished")

if __name__ == '__main__':
    main()