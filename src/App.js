import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";

import {Amplify} from 'aws-amplify';
import awsExports from './aws-exports';
import { generateClient } from 'aws-amplify/api';

Amplify.configure(awsExports);

const client = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await client.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await getUrl({key: note.id});
          note.image = url;
        } return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      country: form.get("country"),
      city: form.get("city"),
      date_arrived: form.get("date_arrived"),
      date_departed: form.get("date_departed"),
      favorite_moments: form.get("favorite_moments"),
      image: image ? image.name : undefined
    };
    const result = await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    if (image) await uploadData({key: result.data.createNote.id, data: image});
    fetchNotes();
    event.target.reset();
  } 

  async function deleteNote({ id }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await remove({key: id});
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App">
      <Heading level={1}>Travel Log</Heading>
      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField name="country" placeholder="Country" label="Country" required />
          <TextField name="city" placeholder="City" label="City" />
          <TextField name="date_arrived" placeholder="Date Arrived" label="Date Arrived" type="date"/>
          <TextField name="date_departed" placeholder="Date Departed" label="Date Departed" type="date"/>
          <TextField name="favorite_moments" placeholder="Favorite Moments" label="Favorite Moments" />
          <View name="image" as="input" type="file" style={{ alignSelf: "end" }} />
          <Button type="submit" variation="primary">Add Entry</Button>
        </Flex>
      </View>
      <Heading level={2}>Your Entries</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex key={note.id || note.country} direction="row" justifyContent="center" alignItems="center">
            <Text as="strong" fontWeight={700}>{note.country} - {note.city}</Text>
            <Text as="span">{note.date_arrived} to {note.date_departed}</Text>
            <Text as="span">{note.favorite_moments}</Text>
            {note.image && (
              <Image src={note.image.url.href} alt={`visual aid for ${note.country}`} style={{ width: 400 }} />
            )}
            <Button variation="link" onClick={() => deleteNote(note)}>Delete Entry</Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);
