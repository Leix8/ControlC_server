import time
import logging
import argparse
import os

def main():
    parser = argparse.ArgumentParser(description="Description of your script")

    # Add arguments
    parser.add_argument('-u', '--username', type=str, required=True, help='username')
    parser.add_argument('-t', '--taskKey', type=str, required=True, help='taskKey')
    parser.add_argument('-i', '--input_path', type=str, required=False, help='path of input task file, *.zip format')
    parser.add_argument('-o', '--output_path', type=str, required=False, help='path of task output file')

    # Parse the arguments
    args = parser.parse_args()

    # Accessing the arguments
    taskKey = args.taskKey
    username = args.username

    this_dir = os.path.dirname(os.path.realpath(__file__))
    logger = logging.getLogger("[process_task.py]")
    logging.basicConfig(filename=os.path.join(this_dir, 'logs', 'task.log'), level=logging.INFO)
    
    TAG = username + ": " + taskKey
    time.sleep(5)
    logger.info(TAG + " finished")

if __name__ == '__main__':
    main()