import { StorageManager } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';


const CreateItem = () => {
  return (
    <StorageManager
      acceptedFileTypes={['image/*']}
      path="picture-submissions/"
      maxFileCount={1}
      isResumable
    />
  );
};

export default CreateItem;